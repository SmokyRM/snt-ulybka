import { NextResponse } from "next/server";
import { getRequestId } from "./requestId";
import { optionalRequire } from "../optionalRequire";
import { logErrorEvent } from "@/lib/errorEvents.store";

// Динамический импорт Sentry (опционально)
// Используем optionalRequire чтобы избежать статического резолвинга в Turbopack
let SentryRespond: typeof import("@sentry/nextjs") | null = null;
try {
  SentryRespond = optionalRequire<typeof import("@sentry/nextjs")>(["@sentry", "nextjs"]);
} catch {
  // Sentry не установлен - это нормально
}

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Маскирует секретные данные в объекте для безопасного логирования
 */
export function maskSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj !== "object") return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(maskSecrets);
  }
  
  const masked: Record<string, unknown> = {};
  const secretKeys = [
    "password",
    "token",
    "secret",
    "apikey",
    "api_key",
    "authorization",
    "cookie",
    "session",
    "auth",
  ];
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    const isSecret = secretKeys.some((secret) => lowerKey.includes(secret));
    
    if (isSecret) {
      masked[key] = "***MASKED***";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      masked[key] = maskSecrets(value);
    } else if (Array.isArray(value)) {
      masked[key] = value.map(maskSecrets);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Создает ответ с request-id в заголовках
 */
function createResponse(
  request: Request,
  data: unknown,
  status: number,
  headers?: HeadersInit,
): NextResponse {
  const requestId = getRequestId(request);
  const response = NextResponse.json(data, { status, headers });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Успешный ответ (200)
 * @returns { ok: true, data: T }
 */
export function ok<T>(request: Request, data: T, init?: { status?: number; headers?: HeadersInit }): NextResponse {
  return createResponse(request, { ok: true, data }, init?.status ?? 200, init?.headers);
}

/**
 * Пустой успешный ответ (204 No Content)
 */
export function noContent(request: Request): NextResponse {
  const requestId = getRequestId(request);
  const response = new NextResponse(null, { status: 204 });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

/**
 * Универсальная функция для ошибок
 * @returns { ok: false, error: { code, message, details } }
 */
export function fail(
  request: Request,
  code: string,
  message: string,
  status: number,
  details?: unknown,
  init?: ResponseInit,
): NextResponse {
  return createResponse(
    request,
    {
      ok: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    status,
    init?.headers,
  );
}

/**
 * Ошибка валидации (400)
 */
export function badRequest(
  request: Request,
  message: string,
  details?: Record<string, unknown>,
): NextResponse {
  return fail(request, "bad_request", message, 400, details);
}

/**
 * Не авторизован (401)
 */
export function unauthorized(request: Request, message?: string): NextResponse {
  return fail(request, "unauthorized", message ?? "Требуется авторизация", 401);
}

/**
 * Запрещено (403)
 */
export function forbidden(request: Request, message?: string): NextResponse {
  return fail(request, "forbidden", message ?? "Доступ запрещён", 403);
}

/**
 * Метод не разрешён (405)
 */
export function methodNotAllowed(request: Request, allowed: string[]): NextResponse {
  return createResponse(
    request,
    {
      ok: false,
      error: {
        code: "method_not_allowed",
        message: `Метод не разрешён. Разрешённые методы: ${allowed.join(", ")}`,
      },
    },
    405,
    {
      Allow: allowed.join(", "),
    },
  );
}

/**
 * Внутренняя ошибка сервера (500)
 * Клиенту без stacktrace, полная информация только в console.error
 */
export function serverError(request: Request, message?: string, error?: unknown): NextResponse {
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;
  
  // Логируем полную информацию в консоль (только в dev показываем stack)
  const errorMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  // Маскируем секреты в контексте ошибки
  const context = {
    pathname,
    message: message ?? "Произошла внутренняя ошибка",
    error: errorMessage,
  };
  const maskedContext = maskSecrets(context) as Record<string, unknown>;
  
  console.error("[api-server-error]", {
    requestId,
    ...maskedContext,
    ...(process.env.NODE_ENV !== "production" && errorStack ? { stack: errorStack } : {}),
  });
  
  // Отправляем ошибку в Sentry если доступен
  if (SentryRespond && error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    SentryRespond.captureException(errorObj, {
      tags: {
        pathname,
        requestId,
      },
      extra: {
        message: message ?? "Произошла внутренняя ошибка",
      },
    });
  }

  try {
    logErrorEvent({
      source: "api",
      key: "internal_error",
      message: message ?? "Произошла внутренняя ошибка",
      stack: errorStack ?? null,
      route: pathname,
      requestId,
    });
  } catch {
    // ignore error event logging failures
  }
  
  // Клиенту отправляем безопасный ответ без stacktrace
  return createResponse(
    request,
    {
      ok: false,
      error: {
        code: "internal_error",
        message: message ?? "Произошла внутренняя ошибка",
        ...(process.env.NODE_ENV !== "production" ? { details: { requestId } } : {}),
      },
    },
    500,
  );
}
