/**
 * Edge-safe структурированное логирование
 * Используется в Edge Runtime (middleware.ts)
 * Без зависимостей от Node.js модулей и Sentry
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  path?: string;
  role?: string | null;
  userId?: string | null;
  action: string;
  status?: number;
  latencyMs?: number;
  requestId?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Форматирует лог в JSON строку для production или читаемый формат для dev
 */
function formatLog(log: StructuredLog): string {
  // В Edge Runtime process.env может быть недоступен, используем проверку через globalThis
  const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
  
  if (isProduction) {
    return JSON.stringify(log);
  }
  // В dev режиме более читаемый формат
  const parts = [
    `[${log.level.toUpperCase()}]`,
    log.action || "unknown",
    log.path ? `path=${log.path}` : "",
    log.role ? `role=${log.role}` : "",
    log.userId ? `userId=${log.userId}` : "",
    log.status ? `status=${log.status}` : "",
    log.latencyMs !== undefined ? `latency=${log.latencyMs}ms` : "",
    log.message ? `msg=${log.message}` : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * Структурированное логирование (Edge-safe)
 */
export function logStructured(level: LogLevel, data: Omit<StructuredLog, "timestamp" | "level">) {
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    action: (data as StructuredLog).action || "unknown",
    ...data,
  };

  const formatted = formatLog(log);
  
  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      const isProduction = typeof process !== "undefined" && process.env?.NODE_ENV === "production";
      if (!isProduction) {
        console.debug(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Логирование auth событий (login/logout/forbidden/rbac deny)
 */
export function logAuthEvent(params: {
  action: "login" | "logout" | "forbidden" | "rbac_deny";
  path: string;
  role?: string | null;
  userId?: string | null;
  status: number;
  latencyMs: number;
  requestId?: string;
  message?: string;
  error?: string;
}) {
  const level = params.status >= 500 ? "error" : params.status >= 400 ? "warn" : "info";
  logStructured(level, {
    action: params.action,
    path: params.path,
    role: params.role,
    userId: params.userId,
    status: params.status,
    latencyMs: params.latencyMs,
    requestId: params.requestId,
    message: params.message,
    error: params.error,
  });
}
