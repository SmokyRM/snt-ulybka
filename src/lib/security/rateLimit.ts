/**
 * Simple in-memory rate limiter.
 * 
 * Tracks requests per key in a sliding window.
 * 
 * IMPORTANT: Only enabled when NODE_ENV !== "production" && ENABLE_QA === "true"
 * This is a dev-only feature for QA endpoints.
 * 
 * @param key - Unique identifier for the rate limit (e.g., IP address or user ID)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with ok boolean and optional retryAfterMs
 */
type RateLimitEntry = {
  timestamps: number[];
  lastCleanup: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastGlobalCleanup = Date.now();

function cleanupOldEntries() {
  const now = Date.now();
  if (now - lastGlobalCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }
  lastGlobalCleanup = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    // Clean up entries older than the longest window we might use (1 hour)
    const cutoff = now - 60 * 60 * 1000;
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    
    // Remove empty entries
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterMs?: number } {
  // Only enabled in dev when ENABLE_QA is true
  const isEnabled = process.env.NODE_ENV !== "production" && process.env.ENABLE_QA === "true";
  if (!isEnabled) {
    return { ok: true };
  }
  
  const now = Date.now();
  
  // Periodic cleanup
  cleanupOldEntries();

  // Get or create entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now };
    rateLimitStore.set(key, entry);
  }

  // Clean up old timestamps for this key
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  // Check if limit exceeded
  if (entry.timestamps.length >= limit) {
    // Calculate retry after (oldest timestamp + window - now)
    const oldestTimestamp = entry.timestamps[0];
    const retryAfterMs = Math.max(0, oldestTimestamp + windowMs - now);
    return { ok: false, retryAfterMs };
  }

  // Add current timestamp
  entry.timestamps.push(now);
  return { ok: true };
}

/**
 * Clear rate limit for a specific key (useful for testing)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
