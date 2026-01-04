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
  pathHint?: string | null;
  topic?: string;
  mode?: "guest_short" | "verified_clarify" | "staff_checklist";
  outOfScope?: boolean;
  latencyMs?: number | null;
  messageLen?: number;
  thumb?: "up" | "down" | null;
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
  operator: { day: 60, minute: 6 },
  user: { day: 30, minute: 5 },
  member: { day: 30, minute: 5 },
  guest: { day: 15, minute: 3 },
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
  const totalKey = `ai:agg:day:${dayKey}:total`;
  const outScopeKey = `ai:agg:day:${dayKey}:out_scope`;
  const latencySumKey = `ai:agg:day:${dayKey}:latency_sum`;
  const latencyCountKey = `ai:agg:day:${dayKey}:latency_count`;
  const userCountKey = `ai:agg:day:${dayKey}:user:${entry.userId}:count`;
  const roleCountKey = `ai:agg:day:${dayKey}:role:${entry.role}:count`;
  const pathHint = entry.pathHint?.trim() || "unknown";
  const topic = entry.topic?.trim() || "unknown";
  const pathCountKey = `ai:agg:day:${dayKey}:path:${pathHint}:count`;
  const topicCountKey = `ai:agg:day:${dayKey}:topic:${topic}:count`;
  const userTokensKey = `ai:agg:day:${dayKey}:user:${entry.userId}:tokens`;
  await kvIncr(totalKey);
  await kvExpire(totalKey, AGG_TTL_SECONDS);
  if (entry.outOfScope) {
    await kvIncr(outScopeKey);
    await kvExpire(outScopeKey, AGG_TTL_SECONDS);
  }
  if (typeof entry.latencyMs === "number" && entry.latencyMs > 0) {
    await kvIncrBy(latencySumKey, Math.round(entry.latencyMs));
    await kvExpire(latencySumKey, AGG_TTL_SECONDS);
    await kvIncr(latencyCountKey);
    await kvExpire(latencyCountKey, AGG_TTL_SECONDS);
  }
  await kvIncr(userCountKey);
  await kvExpire(userCountKey, AGG_TTL_SECONDS);
  await kvIncr(roleCountKey);
  await kvExpire(roleCountKey, AGG_TTL_SECONDS);
  await kvIncr(pathCountKey);
  await kvExpire(pathCountKey, AGG_TTL_SECONDS);
  await kvIncr(topicCountKey);
  await kvExpire(topicCountKey, AGG_TTL_SECONDS);
  if (typeof entry.tokens === "number" && entry.tokens > 0) {
    await kvIncrBy(userTokensKey, entry.tokens);
    await kvExpire(userTokensKey, AGG_TTL_SECONDS);
  }
  await addToList(`ai:agg:day:${dayKey}:users`, entry.userId);
  await addToList(`ai:agg:day:${dayKey}:paths`, pathHint);
  await addToList(`ai:agg:day:${dayKey}:topics`, topic);
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
  totalRequests: number;
  outOfScopeRate: number;
  avgLatencyMs: number | null;
  topPaths: Array<{ pathHint: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  topUsers: Array<{ userId: string; count: number; tokens: number }>;
  roleCounts: Array<{ role: string; count: number }>;
  recentEvents: AiUsageLogEntry[];
};

type AiUsageDashboardOptions = {
  days?: 7 | 30;
  role?: string | null;
  outOfScopeOnly?: boolean;
};

const listDays = (days: number) => {
  const now = new Date();
  return Array.from({ length: days }, (_, index) => {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - index);
    return toUtcDayDash(d);
  });
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export async function getAiUsageDashboard(
  options: AiUsageDashboardOptions = {},
): Promise<AiUsageDashboard | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const days = options.days ?? 7;
    const dayKeys = listDays(days);
    const users = (
      await Promise.all(dayKeys.map((dayKey) => kvGet<string[]>(`ai:agg:day:${dayKey}:users`)))
    )
      .flat()
      .filter(isNonEmptyString);
    const paths = (
      await Promise.all(dayKeys.map((dayKey) => kvGet<string[]>(`ai:agg:day:${dayKey}:paths`)))
    )
      .flat()
      .filter(isNonEmptyString);
    const topics = (
      await Promise.all(dayKeys.map((dayKey) => kvGet<string[]>(`ai:agg:day:${dayKey}:topics`)))
    )
      .flat()
      .filter(isNonEmptyString);
    const uniqueUsers = Array.from(new Set(users));
    const uniquePaths = Array.from(new Set(paths));
    const uniqueTopics = Array.from(new Set(topics));
    const roleKeys = Object.keys(DEFAULT_ROLE_LIMITS);
    const userCounts = await Promise.all(
      uniqueUsers.map(async (userId) => {
        const totals = await Promise.all(
          dayKeys.map(async (dayKey) => {
            const count =
              Number(
                (await kvGet<number | string>(`ai:agg:day:${dayKey}:user:${userId}:count`)) ?? 0,
              ) || 0;
            const tokens =
              Number(
                (await kvGet<number | string>(`ai:agg:day:${dayKey}:user:${userId}:tokens`)) ?? 0,
              ) || 0;
            return { count, tokens };
          }),
        );
        return totals.reduce(
          (acc, item) => ({ userId, count: acc.count + item.count, tokens: acc.tokens + item.tokens }),
          { userId, count: 0, tokens: 0 },
        );
      }),
    );
    const roleCounts = await Promise.all(
      roleKeys.map(async (role) => {
        const counts = await Promise.all(
          dayKeys.map(async (dayKey) => {
            const count =
              Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:role:${role}:count`)) ?? 0) || 0;
            return count;
          }),
        );
        return { role, count: counts.reduce((sum, item) => sum + item, 0) };
      }),
    );
    const pathCounts = await Promise.all(
      uniquePaths.map(async (pathHint) => {
        const counts = await Promise.all(
          dayKeys.map(async (dayKey) => {
            const count =
              Number(
                (await kvGet<number | string>(`ai:agg:day:${dayKey}:path:${pathHint}:count`)) ?? 0,
              ) || 0;
            return count;
          }),
        );
        return { pathHint, count: counts.reduce((sum, item) => sum + item, 0) };
      }),
    );
    const topicCounts = await Promise.all(
      uniqueTopics.map(async (topic) => {
        const counts = await Promise.all(
          dayKeys.map(async (dayKey) => {
            const count =
              Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:topic:${topic}:count`)) ?? 0) ||
              0;
            return count;
          }),
        );
        return { topic, count: counts.reduce((sum, item) => sum + item, 0) };
      }),
    );
    const totals = (
      await Promise.all(
        dayKeys.map(async (dayKey) => {
          const total =
            Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:total`)) ?? 0) || 0;
          const outScope =
            Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:out_scope`)) ?? 0) || 0;
          const sum =
            Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:latency_sum`)) ?? 0) || 0;
          const count =
            Number((await kvGet<number | string>(`ai:agg:day:${dayKey}:latency_count`)) ?? 0) || 0;
          return { total, outScope, sum, count };
        }),
      )
    ).reduce(
      (acc, item) => ({
        total: acc.total + item.total,
        outScope: acc.outScope + item.outScope,
        sum: acc.sum + item.sum,
        count: acc.count + item.count,
      }),
      { total: 0, outScope: 0, sum: 0, count: 0 },
    );
    const totalRequests = totals.total;
    const outOfScopeCount = totals.outScope;
    const latencySum = totals.sum;
    const latencyCount = totals.count;
    const recentEventsAll = (await kvGet<AiUsageLogEntry[]>(RECENT_KEY)) ?? [];
    const recentEvents = recentEventsAll
      .filter((entry) => (options.role ? entry.role === options.role : true))
      .filter((entry) => (options.outOfScopeOnly ? entry.outOfScope : true))
      .slice(0, 50);
    const shouldRecalcFromRecent = Boolean(options.role || options.outOfScopeOnly);
    const recentTotals = shouldRecalcFromRecent
      ? recentEvents.reduce(
          (acc, entry) => {
            acc.total += 1;
            if (entry.outOfScope) acc.outScope += 1;
            if (typeof entry.latencyMs === "number" && entry.latencyMs > 0) {
              acc.latencySum += entry.latencyMs;
              acc.latencyCount += 1;
            }
            const pathKey = entry.pathHint?.trim() || "unknown";
            const topicKey = entry.topic?.trim() || "unknown";
            acc.paths[pathKey] = (acc.paths[pathKey] ?? 0) + 1;
            acc.topics[topicKey] = (acc.topics[topicKey] ?? 0) + 1;
            return acc;
          },
          {
            total: 0,
            outScope: 0,
            latencySum: 0,
            latencyCount: 0,
            paths: {} as Record<string, number>,
            topics: {} as Record<string, number>,
          },
        )
      : null;
    const topUsers = userCounts
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const topPaths = shouldRecalcFromRecent
      ? Object.entries(recentTotals?.paths ?? {})
          .map(([pathHint, count]) => ({ pathHint, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : pathCounts
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topTopics = shouldRecalcFromRecent
      ? Object.entries(recentTotals?.topics ?? {})
          .map(([topic, count]) => ({ topic, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : topicCounts
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const roleFiltered = roleCounts.filter((item) => item.count > 0);
    const summaryTotal = shouldRecalcFromRecent ? recentTotals?.total ?? 0 : totalRequests;
    const summaryOutScope = shouldRecalcFromRecent ? recentTotals?.outScope ?? 0 : outOfScopeCount;
    const summaryLatencySum = shouldRecalcFromRecent ? recentTotals?.latencySum ?? 0 : latencySum;
    const summaryLatencyCount = shouldRecalcFromRecent ? recentTotals?.latencyCount ?? 0 : latencyCount;
    const hasData =
      summaryTotal > 0 || topUsers.length > 0 || roleFiltered.length > 0 || recentEvents.length > 0;
    return {
      hasData,
      totalRequests: summaryTotal,
      outOfScopeRate: summaryTotal > 0 ? summaryOutScope / summaryTotal : 0,
      avgLatencyMs: summaryLatencyCount > 0 ? Math.round(summaryLatencySum / summaryLatencyCount) : null,
      topPaths,
      topTopics,
      topUsers,
      roleCounts: roleFiltered,
      recentEvents,
    };
  } catch {
    return null;
  }
}
