/**
 * Sentry client-side configuration
 * Инициализируется только в production или если SENTRY_DSN установлен
 */

import { optionalRequire } from "./src/lib/optionalRequire";

// Опциональный импорт Sentry (может быть не установлен)
// Используем optionalRequire чтобы избежать статического резолвинга в Turbopack
let SentryClient: typeof import("@sentry/nextjs") | null = null;
try {
  SentryClient = optionalRequire<typeof import("@sentry/nextjs")>(["@sentry", "nextjs"]);
} catch {
  // Sentry не установлен - это нормально
}

const clientDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const clientEnvironment = process.env.NODE_ENV || "development";

// Инициализируем только если DSN установлен и не в dev режиме (или явно включено)
const shouldInitClient = clientDsn && (clientEnvironment === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true");

if (shouldInitClient && SentryClient) {
  SentryClient.init({
    dsn: clientDsn,
    environment: clientEnvironment,
    
    // Игнорируем dev-only ошибки
    ignoreErrors: [
      // React DevTools
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      // Browser extensions
      /Extension context invalidated/,
      /chrome-extension:/,
      /moz-extension:/,
    ],
    
    // Отключаем в dev для уменьшения шума
    enabled: clientEnvironment === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true",
    
    // Настройки производительности
    tracesSampleRate: clientEnvironment === "production" ? 0.1 : 1.0, // 10% в production, 100% в dev
    
    // Настройки для production
    beforeSend(event, _hint) {
      // Фильтруем dev-only ошибки
      if (clientEnvironment !== "production") {
        // В dev режиме логируем, но не отправляем
        if (process.env.NEXT_PUBLIC_SENTRY_ENABLED !== "true") {
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
        
        // Маскируем query параметры с секретами
        if (event.request.query_string) {
          const query = new URLSearchParams(event.request.query_string);
          const sensitiveParams = ["token", "key", "secret", "password"];
          sensitiveParams.forEach((param) => {
            if (query.has(param)) {
              query.set(param, "[Filtered]");
            }
          });
          event.request.query_string = query.toString();
        }
      }
      
      return event;
    },
    
    // Интеграции (проверяем наличие методов для совместимости)
    integrations: [
      ...(SentryClient.browserTracingIntegration
        ? [SentryClient.browserTracingIntegration()]
        : []),
      ...(SentryClient.replayIntegration
        ? [
            SentryClient.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ]
        : []),
    ],
  });
}
