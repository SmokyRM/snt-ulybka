import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { searchAll } from "@/server/services/search";
import { getRequestId } from "@/lib/api/requestId";
import { logApiRequest } from "@/lib/structuredLogger/node";

export async function GET(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const limitParam = searchParams.get("limit");

    if (!q || !q.trim()) {
      logApiRequest({
        path: pathname,
        method: "GET",
        role: null,
        userId: null,
        status: 200,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return ok(request, { plots: [], appeals: [], people: [] });
    }

    // Защита от тяжелых запросов: минимальная длина
    if (q.trim().length < 2) {
      logApiRequest({
        path: pathname,
        method: "GET",
        role: null,
        userId: null,
        status: 400,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return fail(request, "validation_error", "Запрос должен содержать минимум 2 символа", 400);
    }

    // Защита от тяжелых запросов: максимальная длина
    if (q.trim().length > 100) {
      logApiRequest({
        path: pathname,
        method: "GET",
        role: null,
        userId: null,
        status: 400,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return fail(request, "validation_error", "Запрос не должен превышать 100 символов", 400);
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limit && (isNaN(limit) || limit < 1 || limit > 50)) {
      logApiRequest({
        path: pathname,
        method: "GET",
        role: null,
        userId: null,
        status: 400,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return fail(request, "validation_error", "Limit должен быть от 1 до 50", 400);
    }

    const result = await searchAll({ q: q.trim(), limit });

    const latencyMs = Date.now() - startTime;
    logApiRequest({
      path: pathname,
      method: "GET",
      role: null,
      userId: null,
      status: 200,
      latencyMs,
      requestId,
    });

    return ok(request, result);
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    const status = errorMessage === "UNAUTHORIZED" ? 401 : errorMessage === "FORBIDDEN" ? 403 : errorMessage === "QUERY_TOO_LONG" ? 400 : 500;

    logApiRequest({
      path: pathname,
      method: "GET",
      role: null,
      userId: null,
      status,
      latencyMs,
      requestId,
      error: errorMessage,
    });

    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") {
        return unauthorized(request);
      }
      if (err.message === "FORBIDDEN") {
        return forbidden(request);
      }
      if (err.message === "QUERY_TOO_LONG") {
        return fail(request, "validation_error", "Запрос слишком длинный", 400);
      }
    }
    return serverError(request, "Ошибка при выполнении поиска", err);
  }
}
