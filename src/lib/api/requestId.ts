/**
 * Helper для работы с request-id в API routes
 */

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Получает request-id из заголовков запроса или генерирует новый
 */
export function getRequestId(request: Request): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing) return existing;
  
  // Генерируем новый request-id (UUID v4)
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  
  // Fallback для Node.js runtime
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Добавляет request-id в заголовки ответа
 */
export function setRequestIdHeader(response: Response, requestId: string): void {
  response.headers.set(REQUEST_ID_HEADER, requestId);
}

/**
 * Логирует ошибку с request-id и контекстом
 */
export function logApiError(
  requestId: string,
  pathname: string,
  role: string | null,
  status: number,
  error: unknown,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error("[api-error]", {
    requestId,
    pathname,
    role: role ?? "none",
    status,
    error: errorMessage,
    ...(process.env.NODE_ENV !== "production" && errorStack ? { stack: errorStack } : {}),
  });
}
