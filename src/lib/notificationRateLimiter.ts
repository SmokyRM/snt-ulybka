/**
 * Notification Rate Limiter
 * Sprint 19: Server-side rate limiting for notification sending
 */

// Default: max 50 messages per 10 minutes
const DEFAULT_MAX_MESSAGES = 50;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface RateLimitState {
  timestamps: number[];
  windowMs: number;
  maxMessages: number;
}

const getRateLimitState = (): RateLimitState => {
  const g = globalThis as typeof globalThis & { __SNT_NOTIFICATION_RATE_LIMIT__?: RateLimitState };
  if (!g.__SNT_NOTIFICATION_RATE_LIMIT__) {
    const maxMessages = parseInt(process.env.NOTIFICATION_RATE_LIMIT_MAX || "", 10) || DEFAULT_MAX_MESSAGES;
    const windowMs = parseInt(process.env.NOTIFICATION_RATE_LIMIT_WINDOW_MS || "", 10) || DEFAULT_WINDOW_MS;
    g.__SNT_NOTIFICATION_RATE_LIMIT__ = {
      timestamps: [],
      windowMs,
      maxMessages,
    };
  }
  return g.__SNT_NOTIFICATION_RATE_LIMIT__;
};

/**
 * Clean up old timestamps outside the window
 */
function cleanupTimestamps(state: RateLimitState): void {
  const now = Date.now();
  const cutoff = now - state.windowMs;
  state.timestamps = state.timestamps.filter((ts) => ts > cutoff);
}

/**
 * Check if we can send more messages
 */
export function canSendNotification(): { allowed: boolean; remaining: number; resetInMs: number } {
  const state = getRateLimitState();
  cleanupTimestamps(state);

  const remaining = Math.max(0, state.maxMessages - state.timestamps.length);
  const allowed = remaining > 0;

  // Calculate when the oldest timestamp will expire
  let resetInMs = 0;
  if (!allowed && state.timestamps.length > 0) {
    const oldestTimestamp = Math.min(...state.timestamps);
    resetInMs = Math.max(0, oldestTimestamp + state.windowMs - Date.now());
  }

  return { allowed, remaining, resetInMs };
}

/**
 * Record a sent notification
 */
export function recordNotificationSent(): void {
  const state = getRateLimitState();
  cleanupTimestamps(state);
  state.timestamps.push(Date.now());
}

/**
 * Get rate limit info
 */
export function getRateLimitInfo(): {
  maxMessages: number;
  windowMs: number;
  sentInWindow: number;
  remaining: number;
  resetInMs: number;
} {
  const state = getRateLimitState();
  cleanupTimestamps(state);

  const sentInWindow = state.timestamps.length;
  const remaining = Math.max(0, state.maxMessages - sentInWindow);

  let resetInMs = 0;
  if (sentInWindow > 0) {
    const oldestTimestamp = Math.min(...state.timestamps);
    resetInMs = Math.max(0, oldestTimestamp + state.windowMs - Date.now());
  }

  return {
    maxMessages: state.maxMessages,
    windowMs: state.windowMs,
    sentInWindow,
    remaining,
    resetInMs,
  };
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter(): void {
  const state = getRateLimitState();
  state.timestamps = [];
}
