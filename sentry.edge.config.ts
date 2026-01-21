/**
 * Sentry edge runtime configuration
 * Для middleware и edge functions
 */

import { optionalRequire } from "./src/lib/optionalRequire";

// Опциональный импорт Sentry (может быть не установлен)
// Используем optionalRequire чтобы избежать статического резолвинга в Turbopack
let SentryEdge: typeof import("@sentry/nextjs") | null = null;
try {
  SentryEdge = optionalRequire<typeof import("@sentry/nextjs")>(["@sentry", "nextjs"]);
} catch {
  // Sentry не установлен - это нормально
}

const edgeDsn = process.env.SENTRY_DSN;
const edgeEnvironment = process.env.NODE_ENV || "development";

// Инициализируем только если DSN установлен и не в dev режиме (или явно включено)
const shouldInitEdge = edgeDsn && (edgeEnvironment === "production" || process.env.SENTRY_ENABLED === "true");

if (shouldInitEdge && SentryEdge) {
  SentryEdge.init({
    dsn: edgeDsn,
    environment: edgeEnvironment,
    
    // Отключаем в dev для уменьшения шума
    enabled: edgeEnvironment === "production" || process.env.SENTRY_ENABLED === "true",
    
    // Настройки производительности (edge runtime ограничен)
    tracesSampleRate: edgeEnvironment === "production" ? 0.05 : 1.0, // 5% в production
    
    // Настройки для production
    beforeSend(event) {
      // Фильтруем dev-only ошибки
      if (edgeEnvironment !== "production") {
        if (process.env.SENTRY_ENABLED !== "true") {
          return null;
        }
      }
      
      // Маскируем чувствительные данные
      if (event.request?.headers) {
        const sensitiveHeaders = ["authorization", "cookie"];
        sensitiveHeaders.forEach((header) => {
          if (event.request?.headers?.[header]) {
            event.request.headers[header] = "[Filtered]";
          }
        });
      }
      
      return event;
    },
  });
}
