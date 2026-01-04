type RateLimitResult = {
  allowed: boolean;
  minuteCount: number;
  dayCount: number;
};

export type AiUsageSource = "assistant" | "cache" | "faq";

export type AiUsageLogEntry = {
  userId: string;
  role: string;
  source: AiUsageSource;
  cached: boolean;
  ts: string;
  success: boolean;
  tokens: number | null;
  error?: string | null;
};

const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

type RoleLimits = { minute: number; day: number };
type RoleLimitsMap = Record<string, RoleLimits>;

const DEFAULT_ROLE_LIMITS: RoleLimitsMap = {
  admin: { day: 200, minute: 20 },
  board: { day: 100, minute: 10 },
  accountant: { day: 60, minute: 6 },
  user: { day: 0, minute: 0 },
  member: { day: 0, minute: 0 },
  operator: { day: 0, minute: 0 },
  guest: { day: 0, minute: 0 },
};

const DAY_TTL_SECONDS = 60 * 60 * 24;
const MINUTE_TTL_SECONDS = 60;
const LOG_TTL_SECONDS = 60 * 60 * 24 * 30;
const AGG_TTL_SECONDS = 60 * 60 * 24 * 30;
const RECENT_KEY = "ai:recent";
const RECENT_LIMIT = 50;

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toUtcDay = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const toUtcDayDash = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toUtcMinute = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
};

const parseLimitsFromEnv = (): RoleLimitsMap | null => {
  const raw = process.env.AI_LIMITS_JSON?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RoleLimitsMap;
    return parsed;
  } catch {
    return null;
  }
};

const getRoleLimits = (role: string): RoleLimits => {
  const overrides = parseLimitsFromEnv();
  const source = overrides ?? DEFAULT_ROLE_LIMITS;
  const normalizedRole = role || "guest";
  const limits = source[normalizedRole];
  return limits ?? DEFAULT_ROLE_LIMITS[normalizedRole] ?? { day: 0, minute: 0 };
};

async function kvFetch(path: string, init?: RequestInit) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("AI_USAGE_STORE_UNCONFIGURED");
  }
  const res = await fetch(`${KV_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI_USAGE_STORE_KV_ERROR:${res.status}:${text}`);
  }
  return res.json() as Promise<{ result?: unknown }>;
}

const kvIncr = async (key: string) => {
  const data = await kvFetch(`/incr/${encodeURIComponent(key)}`, { method: "POST" });
  return Number(data?.result ?? 0);
};

const kvIncrBy = async (key: string, amount: number) => {
  const data = await kvFetch(`/incrby/${encodeURIComponent(key)}/${amount}`, { method: "POST" });
  return Number(data?.result ?? 0);
};

const kvExpire = async (key: string, seconds: number) => {
  await kvFetch(`/expire/${encodeURIComponent(key)}/${seconds}`, { method: "POST" });
};

const kvGet = async <T>(key: string): Promise<T | null> => {
  const data = await kvFetch(`/get/${encodeURIComponent(key)}`);
  const raw = data?.result;
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as T;
    }
  }
  return raw as T;
};

const kvSet = async (key: string, value: unknown) => {
  await kvFetch(`/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
};

const addToList = async (key: string, value: string) => {
  const current = (await kvGet<string[]>(key)) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    await kvSet(key, current);
    await kvExpire(key, AGG_TTL_SECONDS);
  }
};

const appendRecentEvent = async (entry: AiUsageLogEntry) => {
  const existing = (await kvGet<AiUsageLogEntry[]>(RECENT_KEY)) ?? [];
  const next = [entry, ...existing].slice(0, RECENT_LIMIT);
  await kvSet(RECENT_KEY, next);
  await kvExpire(RECENT_KEY, AGG_TTL_SECONDS);
};

const incrementAggregates = async (entry: AiUsageLogEntry) => {
  const ts = new Date(entry.ts);
  const date = Number.isNaN(ts.getTime()) ? new Date() : ts;
  const dayKey = toUtcDayDash(date);
  const userCountKey = `ai:agg:day:${dayKey}:user:${entry.userId}:count`;
  const roleCountKey = `ai:agg:day:${dayKey}:role:${entry.role}:count`;
  const userTokensKey = `ai:agg:day:${dayKey}:user:${entry.userId}:tokens`;
  await kvIncr(userCountKey);
  await kvExpire(userCountKey, AGG_TTL_SECONDS);
  await kvIncr(roleCountKey);
  await kvExpire(roleCountKey, AGG_TTL_SECONDS);
  if (typeof entry.tokens === "number" && entry.tokens > 0) {
    await kvIncrBy(userTokensKey, entry.tokens);
    await kvExpire(userTokensKey, AGG_TTL_SECONDS);
  }
  await addToList(`ai:agg:day:${dayKey}:users`, entry.userId);
};

export async function enforceAiRateLimit(
  userId: string,
  role: string,
  now = new Date(),
): Promise<RateLimitResult> {
  const limits = getRoleLimits(role);
  if (limits.day <= 0 || limits.minute <= 0) {
    return { allowed: false, minuteCount: 0, dayCount: 0 };
  }
  const minuteKey = `ai_usage:minute:${userId}:${toUtcMinute(now)}`;
  const dayKey = `ai_usage:day:${userId}:${toUtcDay(now)}`;
  const [minuteCount, dayCount] = await Promise.all([kvIncr(minuteKey), kvIncr(dayKey)]);
  if (minuteCount === 1) {
    await kvExpire(minuteKey, MINUTE_TTL_SECONDS);
  }
  if (dayCount === 1) {
    await kvExpire(dayKey, DAY_TTL_SECONDS);
  }
  return {
    allowed: minuteCount <= limits.minute && dayCount <= limits.day,
    minuteCount,
    dayCount,
  };
}

export async function logAiUsage(entry: AiUsageLogEntry): Promise<void> {
  try {
    const key = `ai_usage:log:${entry.userId}:${makeId()}`;
    await kvSet(key, entry);
    await kvExpire(key, LOG_TTL_SECONDS);
    await incrementAggregates(entry);
    await appendRecentEvent(entry);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ai-usage] log failed", error);
    }
  }
}

export type AiUsageDashboard = {
  hasData: boolean;
  topUsers: Array<{ userId: string; count: number; tokens: number }>;
  roleCounts: Array<{ role: string; count: number }>;
  recentEvents: AiUsageLogEntry[];
};

export async function getAiUsageDashboard(date = new Date()): Promise<AiUsageDashboard | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const dayKey = toUtcDayDash(date);
    const users = (await kvGet<string[]>(`ai:agg:day:${dayKey}:users`)) ?? [];
    const roleKeys = Object.keys(DEFAULT_ROLE_LIMITS);
    const userCounts = await Promise.all(
      users.map(async (userId) => {
        const count =
          Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:user:${userId}:count`)) ?? 0) || 0;
        const tokens =
          Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:user:${userId}:tokens`)) ?? 0) || 0;
        return { userId, count, tokens };
      }),
    );
    const roleCounts = await Promise.all(
      roleKeys.map(async (role) => {
        const count =
          Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:role:${role}:count`)) ?? 0) || 0;
        return { role, count };
      }),
    );
    const recentEvents = (await kvGet<AiUsageLogEntry[]>(RECENT_KEY)) ?? [];
    const topUsers = userCounts
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const roleFiltered = roleCounts.filter((item) => item.count > 0);
    const hasData = topUsers.length > 0 || roleFiltered.length > 0 || recentEvents.length > 0;
    return {
      hasData,
      topUsers,
      roleCounts: roleFiltered,
      recentEvents,
    };
  } catch {
    return null;
  }
}
