type RateLimitResult = {
  allowed: boolean;
  minuteCount: number;
  dayCount: number;
};

export type AiUsageLogEntry = {
  userId: string;
  ts: string;
  success: boolean;
  tokens: number | null;
  error?: string | null;
};

const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const MINUTE_LIMIT = 5;
const DAY_LIMIT = 30;
const DAY_TTL_SECONDS = 60 * 60 * 24;
const MINUTE_TTL_SECONDS = 60;
const LOG_TTL_SECONDS = 60 * 60 * 24 * 30;

const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toUtcDay = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

const toUtcMinute = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
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

const kvExpire = async (key: string, seconds: number) => {
  await kvFetch(`/expire/${encodeURIComponent(key)}/${seconds}`, { method: "POST" });
};

const kvSet = async (key: string, value: unknown) => {
  await kvFetch(`/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
};

export async function enforceAiRateLimit(userId: string, now = new Date()): Promise<RateLimitResult> {
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
    allowed: minuteCount <= MINUTE_LIMIT && dayCount <= DAY_LIMIT,
    minuteCount,
    dayCount,
  };
}

export async function logAiUsage(entry: AiUsageLogEntry): Promise<void> {
  try {
    const key = `ai_usage:log:${entry.userId}:${makeId()}`;
    await kvSet(key, entry);
    await kvExpire(key, LOG_TTL_SECONDS);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ai-usage] log failed", error);
    }
  }
}
