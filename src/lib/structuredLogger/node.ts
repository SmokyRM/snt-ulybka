/**
 * Node.js структурированное логирование
 * Используется в API routes (app/api routes)
 * Поддерживает опциональную интеграцию с Sentry через optionalRequire
 */

import { optionalRequire } from "../optionalRequire";

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

// Опциональный Sentry - загружается только если пакет установлен
// Используем optionalRequire чтобы избежать статического резолвинга в Turbopack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SentryLogger: any = null;
try {
  SentryLogger = optionalRequire(["@sentry", "nextjs"]);
} catch {
  // Sentry не установлен - это нормально
}

/**
 * Форматирует лог в JSON строку для production или читаемый формат для dev
 */
function formatLog(log: StructuredLog): string {
  if (process.env.NODE_ENV === "production") {
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
 * Структурированное логирование (Node.js)
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
      if (process.env.NODE_ENV !== "production") {
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

/**
 * Логирование API запросов
 * Отправляет ошибки (status >= 500) в Sentry, если пакет установлен
 */
export function logApiRequest(params: {
  path: string;
  method: string;
  role?: string | null;
  userId?: string | null;
  status: number;
  latencyMs: number;
  requestId?: string;
  error?: string;
}) {
  const level = params.status >= 500 ? "error" : params.status >= 400 ? "warn" : "info";
  logStructured(level, {
    action: "api_request",
    path: params.path,
    method: params.method,
    role: params.role,
    userId: params.userId,
    status: params.status,
    latencyMs: params.latencyMs,
    requestId: params.requestId,
    error: params.error,
  });
  
  // Отправляем ошибки в Sentry (только если пакет установлен)
  if (params.status >= 500 && SentryLogger && params.error) {
    try {
      SentryLogger.captureException(new Error(params.error), {
        tags: {
          path: params.path,
          method: params.method,
          status: params.status,
          requestId: params.requestId,
        },
        user: params.userId ? { id: params.userId, role: params.role ?? undefined } : undefined,
        extra: {
          latencyMs: params.latencyMs,
        },
      });
    } catch (sentryError) {
      // Игнорируем ошибки Sentry, чтобы не ломать логирование
      if (process.env.NODE_ENV !== "production") {
        console.warn("[structuredLogger] Sentry captureException failed:", sentryError);
      }
    }
  }
}
