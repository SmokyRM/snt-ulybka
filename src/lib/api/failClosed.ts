import { NextResponse } from "next/server";
import { getRequestId, setRequestIdHeader, logApiError } from "./requestId";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";

type AllowedMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Fail-closed helper для API routes
 * Проверяет метод, авторизацию, роль и возвращает соответствующие ошибки
 */
export async function failClosed(
  request: Request,
  options: {
    allowedMethods: AllowedMethod[];
    requireAuth?: boolean;
    requireRole?: "admin" | "office" | "any";
    pathname?: string;
  },
): Promise<NextResponse | null> {
  const requestId = getRequestId(request);
  const method = request.method as AllowedMethod;
  const pathname = options.pathname || new URL(request.url).pathname;
  
  // 1. Проверка метода
  if (!options.allowedMethods.includes(method)) {
    const response = NextResponse.json(
      { error: "method_not_allowed", message: `Метод ${method} не разрешён` },
      { status: 405 },
    );
    response.headers.set("Allow", options.allowedMethods.join(", "));
    setRequestIdHeader(response, requestId);
    logApiError(requestId, pathname, null, 405, new Error(`Method ${method} not allowed`));
    return response;
  }
  
  // 2. Проверка авторизации
  if (options.requireAuth || options.requireRole) {
    const user = await getSessionUser();
    const role = user?.role ?? null;
    
    if (!user) {
      const response = NextResponse.json(
        { error: "unauthorized", message: "Требуется авторизация" },
        { status: 401 },
      );
      setRequestIdHeader(response, requestId);
      logApiError(requestId, pathname, null, 401, new Error("Unauthorized"));
      return response;
    }
    
    // 3. Проверка роли
    if (options.requireRole === "admin" && !isAdminRole(role)) {
      const response = NextResponse.json(
        { error: "forbidden", message: "Требуется роль администратора" },
        { status: 403 },
      );
      setRequestIdHeader(response, requestId);
      logApiError(requestId, pathname, role, 403, new Error("Admin role required"));
      return response;
    }
    
    if (options.requireRole === "office" && !isOfficeRole(role)) {
      const response = NextResponse.json(
        { error: "forbidden", message: "Требуется роль правления" },
        { status: 403 },
      );
      setRequestIdHeader(response, requestId);
      logApiError(requestId, pathname, role, 403, new Error("Office role required"));
      return response;
    }
  }
  
  return null; // Все проверки пройдены
}

/**
 * Обработка ошибок в API routes без stacktrace в ответе
 */
export async function handleApiError(
  request: Request,
  error: unknown,
  defaultStatus: number = 500,
): Promise<NextResponse> {
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;
  const user = await getSessionUser().catch(() => null);
  const role = user?.role ?? null;
  
  // Логируем полную ошибку в консоль (только в dev)
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  logApiError(requestId, pathname, role, defaultStatus, error);
  
  // В dev показываем больше информации
  if (process.env.NODE_ENV !== "production") {
    console.error("[api-error-details]", {
      requestId,
      pathname,
      role: role ?? "none",
      error: errorMessage,
      stack: errorStack,
    });
  }
  
  // В ответе не показываем stacktrace
  const response = NextResponse.json(
    {
      error: "internal_error",
      message: "Произошла внутренняя ошибка",
      requestId: process.env.NODE_ENV !== "production" ? requestId : undefined,
    },
    { status: defaultStatus },
  );
  
  setRequestIdHeader(response, requestId);
  return response;
}
