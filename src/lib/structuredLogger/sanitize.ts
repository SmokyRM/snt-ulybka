const SENSITIVE_KEY_RE =
  /password|passphrase|token|secret|cookie|session|authorization|api[-_]?key|refresh|access|email|phone/i;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const BEARER_RE = /(Bearer\s+)[A-Za-z0-9._-]+/gi;
const KV_RE = /(\b(?:session_secret|secret|token|api_key|apikey|cookie)\b)\s*=\s*([^\s;]+)/gi;

type UnknownRecord = Record<string, unknown>;

const redactString = (value: string): string => {
  let out = value;
  out = out.replace(EMAIL_RE, "[REDACTED_EMAIL]");
  out = out.replace(PHONE_RE, "[REDACTED_PHONE]");
  out = out.replace(BEARER_RE, "$1[REDACTED]");
  out = out.replace(KV_RE, "$1=[REDACTED]");
  return out;
};

const isSensitiveKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  if (lower.endsWith("_secret") || lower.endsWith("_token")) return true;
  return SENSITIVE_KEY_RE.test(lower);
};

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return value;
  if (typeof value === "function") return "[Function]";

  if (depth <= 0) return "[Truncated]";

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth - 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);
    const out: UnknownRecord = {};
    for (const [key, val] of Object.entries(value as UnknownRecord)) {
      if (isSensitiveKey(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = sanitizeValue(val, depth - 1, seen);
      }
    }
    return out;
  }

  return String(value);
}

export function sanitizeForLog<T>(value: T, depth = 4): T {
  const sanitized = sanitizeValue(value, depth, new WeakSet());
  return sanitized as T;
}

export function sanitizeString(value: string): string {
  return redactString(value);
}
