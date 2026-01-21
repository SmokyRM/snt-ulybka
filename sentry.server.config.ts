/**
 * Sentry server-side configuration
 * Инициализируется только в production или если SENTRY_DSN установлен
 */

import { optionalRequire } from "./src/lib/optionalRequire";

// Опциональный импорт Sentry (может быть не установлен)
// Используем optionalRequire чтобы избежать статического резолвинга в Turbopack
let SentryServer: typeof import("@sentry/nextjs") | null = null;
try {
  SentryServer = optionalRequire<typeof import("@sentry/nextjs")>(["@sentry", "nextjs"]);
} catch {
  // Sentry не установлен - это нормально
}

const serverDsn = process.env.SENTRY_DSN;
const serverEnvironment = process.env.NODE_ENV || "development";

// Инициализируем только если DSN установлен и не в dev режиме (или явно включено)
const shouldInitServer = serverDsn && (serverEnvironment === "production" || process.env.SENTRY_ENABLED === "true");

if (shouldInitServer && SentryServer) {
  SentryServer.init({
    dsn: serverDsn,
    environment: serverEnvironment,
    
    // Игнорируем dev-only ошибки
    ignoreErrors: [
      "Non-Error promise rejection captured",
      // Next.js dev errors
      /ENOENT/,
      /ECONNREFUSED/,
    ],
    
    // Отключаем в dev для уменьшения шума
    enabled: serverEnvironment === "production" || process.env.SENTRY_ENABLED === "true",
    
    // Настройки производительности
    tracesSampleRate: serverEnvironment === "production" ? 0.1 : 1.0, // 10% в production, 100% в dev
    
    // Настройки для production
    beforeSend(event, hint) {
      // Фильтруем dev-only ошибки
      if (serverEnvironment !== "production") {
        // В dev режиме логируем, но не отправляем
        if (process.env.SENTRY_ENABLED !== "true") {
          return null;
        }
      }
      
      // Маскируем чувствительные данные
      if (event.request) {
        if (event.request.headers) {
          // Удаляем секретные заголовки
          const sensitiveHeaders = ["authorization", "cookie", "x-api-key"];
          sensitiveHeaders.forEach((header) => {
            if (event.request?.headers?.[header]) {
              event.request.headers[header] = "[Filtered]";
            }
          });
        }
      }
      
      // Добавляем контекст из request-id если есть
      if (hint.originalException) {
        const error = hint.originalException;
        if (error && typeof error === "object" && "requestId" in error) {
          event.tags = {
            ...event.tags,
            requestId: String(error.requestId),
          };
        }
      }
      
      return event;
    },
    
    // Интеграции (nodeProfilingIntegration не доступен в @sentry/nextjs, требуется @sentry/profiling-node)
    // В dev режиме отключаем profiling для избежания проблем при сборке
    integrations: [],
  });
}
