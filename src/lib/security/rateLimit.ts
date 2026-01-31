import "server-only";
import { incMetric } from "@/lib/metrics";

type RateLimitResult = {
  ok: boolean;
  retryAfterMs?: number;
  limit?: number;
  remaining?: number;
  resetAt?: number;
};

type RateLimitStore = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<void>;
};

const KV_URL =
  process.env.KV_URL ?? process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_WRITE_TOKEN =
  process.env.KV_TOKEN ??
  process.env.KV_REST_API_TOKEN ??
  process.env.UPSTASH_REDIS_REST_TOKEN;
const KV_READ_TOKEN =
  KV_WRITE_TOKEN ??
  process.env.KV_REST_API_READ_ONLY_TOKEN ??
  process.env.UPSTASH_REDIS_REST_READ_ONLY_TOKEN;

const isKvConfigured = () => Boolean(KV_URL && (KV_READ_TOKEN || KV_WRITE_TOKEN));
const isKvWriteConfigured = () => Boolean(KV_URL && KV_WRITE_TOKEN);
const useMemoryStore = !isKvConfigured() && process.env.NODE_ENV !== "production";

const RATE_LIMIT_ENABLED =
  process.env.RATE_LIMIT_ENABLED === "true" || process.env.NODE_ENV === "production";

const memStore = new Map<string, { count: number; resetAt: number }>();

const nowMs = () => Date.now();

async function kvFetch(path: string, init?: RequestInit, requireWrite = false) {
  if (!KV_URL || (!KV_READ_TOKEN && !KV_WRITE_TOKEN)) {
    throw new Error("RATE_LIMIT_KV_UNCONFIGURED");
  }
  const token = requireWrite ? KV_WRITE_TOKEN : KV_READ_TOKEN;
  if (!token) {
    throw new Error("RATE_LIMIT_KV_UNCONFIGURED");
  }
  const res = await fetch(`${KV_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RATE_LIMIT_KV_ERROR:${res.status}:${text}`);
  }
  return res.json() as Promise<{ result?: unknown }>;
}

const kvIncr = async (key: string) => {
  if (useMemoryStore) {
    const entry = memStore.get(key);
    if (!entry) {
      memStore.set(key, { count: 1, resetAt: nowMs() });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  }
  if (!isKvWriteConfigured()) return 0;
  const data = await kvFetch(`/incr/${encodeURIComponent(key)}`, { method: "POST" }, true);
  return Number(data?.result ?? 0);
};

const kvExpire = async (key: string, seconds: number) => {
  if (useMemoryStore) return;
  if (!isKvWriteConfigured()) return;
  await kvFetch(`/expire/${encodeURIComponent(key)}/${seconds}`, { method: "POST" }, true);
};

export function createMemoryRateLimitStore(shared?: Map<string, { count: number; resetAt: number }>): RateLimitStore {
  const store = shared ?? new Map<string, { count: number; resetAt: number }>();
  return {
    incr: async (key: string) => {
      const entry = store.get(key);
      if (!entry) {
        store.set(key, { count: 1, resetAt: nowMs() });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
    expire: async (key: string, seconds: number) => {
      const entry = store.get(key);
      if (!entry) return;
      entry.resetAt = nowMs() + seconds * 1000;
    },
  };
}

export function createRateLimiter(store: RateLimitStore) {
  return async (key: string, limit: number, windowMs: number): Promise<RateLimitResult> => {
    if (!RATE_LIMIT_ENABLED) {
      return { ok: true, limit, remaining: limit };
    }

    const now = nowMs();
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const windowId = Math.floor(now / windowMs);
    const storageKey = `rate:${key}:${windowId}`;
    const count = await store.incr(storageKey);
    if (count === 1) {
      await store.expire(storageKey, windowSeconds);
    }
    const resetAt = (windowId + 1) * windowMs;
    const remaining = Math.max(0, limit - count);
    if (count > limit) {
      incMetric("rate_limit.blocked", 1);
      return {
        ok: false,
        retryAfterMs: Math.max(0, resetAt - now),
        limit,
        remaining: 0,
        resetAt,
      };
    }
    incMetric("rate_limit.allowed", 1);
    return { ok: true, limit, remaining, resetAt };
  };
}

const defaultStore: RateLimitStore = {
  incr: kvIncr,
  expire: kvExpire,
};

const rateLimitImpl = createRateLimiter(defaultStore);

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!RATE_LIMIT_ENABLED) {
    return { ok: true, limit, remaining: limit };
  }
  if (!useMemoryStore && !isKvConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[rate-limit] KV not configured, allowing all requests");
    }
    return { ok: true, limit, remaining: limit };
  }
  const result = await rateLimitImpl(key, limit, windowMs);
  return result;
}

export function buildRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: Record<string, string> = {};
  if (typeof result.limit === "number") headers["X-RateLimit-Limit"] = String(result.limit);
  if (typeof result.remaining === "number") headers["X-RateLimit-Remaining"] = String(result.remaining);
  if (typeof result.resetAt === "number") headers["X-RateLimit-Reset"] = String(Math.ceil(result.resetAt / 1000));
  if (typeof result.retryAfterMs === "number") headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  return headers;
}

export function clearRateLimit(_key: string): void {
  memStore.clear();
}

export function clearAllRateLimits(): void {
  memStore.clear();
}
