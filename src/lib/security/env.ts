import { isProduction } from "@/lib/qaGuard";

let _warnedOnce = false;

/**
 * Returns SESSION_SECRET or null.  Never throws.
 */
export const getSessionSecret = (): string | null => {
  const secret = process.env.SESSION_SECRET?.trim() || null;
  return secret;
};

/**
 * Returns SESSION_SECRET, throwing a clear error if missing.
 * In non-production environments a single console.warn is emitted
 * before the throw so that the missing-secret issue is visible in
 * the dev-server log even if the caller swallows the error.
 */
export const assertSessionSecret = (): string => {
  const secret = getSessionSecret();
  if (secret) return secret;

  const env = isProduction() ? "production" : process.env.NODE_ENV ?? "unknown";
  const message =
    "SESSION_SECRET is not set. " +
    "Set it in .env.local (or your deployment env). " +
    `[current NODE_ENV=${env}]`;

  if (!isProduction() && !_warnedOnce) {
    _warnedOnce = true;
    console.warn("[snt] " + message);
  }

  throw new Error(message);
};

// Exported so tests can reset the single-shot flag between cases.
export const _resetWarnedOnce = () => {
  _warnedOnce = false;
};
