import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getIssues, applyFix } from "@/server/services/dataQuality";
import { getRequestId } from "@/lib/api/requestId";
import { logApiRequest } from "@/lib/structuredLogger/node";

export async function GET(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as "plots" | "appeals" | "payments" | null;
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const issues = await getIssues({ type: type || undefined, limit });

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

    return ok(request, { issues });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const status = errorMessage === "UNAUTHORIZED" ? 401 : errorMessage === "FORBIDDEN" ? 403 : 500;

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

    if (errorMessage === "UNAUTHORIZED") {
      return unauthorized(request);
    }
    if (errorMessage === "FORBIDDEN") {
      return forbidden(request);
    }

    return serverError(request, "Ошибка при получении проблем качества данных", error);
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;

  try {
    const body = await request.json();
    const { issueId, fixType, payload } = body;

    if (!issueId || !fixType) {
      logApiRequest({
        path: pathname,
        method: "POST",
        role: null,
        userId: null,
        status: 400,
        latencyMs: Date.now() - startTime,
        requestId,
      });
      return fail(request, "validation_error", "Отсутствуют обязательные поля issueId или fixType", 400);
    }

    const result = await applyFix({ issueId, fixType, payload });

    const latencyMs = Date.now() - startTime;
    logApiRequest({
      path: pathname,
      method: "POST",
      role: null,
      userId: null,
      status: 200,
      latencyMs,
      requestId,
    });

    return ok(request, result);
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    const status = errorMessage === "UNAUTHORIZED" ? 401 : errorMessage === "FORBIDDEN" ? 403 : errorMessage === "NOT_FOUND" ? 404 : 500;

    logApiRequest({
      path: pathname,
      method: "POST",
      role: null,
      userId: null,
      status,
      latencyMs,
      requestId,
      error: errorMessage,
    });

    if (errorMessage === "UNAUTHORIZED") {
      return unauthorized(request);
    }
    if (errorMessage === "FORBIDDEN") {
      return forbidden(request);
    }
    if (errorMessage === "NOT_FOUND") {
      return fail(request, "not_found", "Проблема не найдена", 404);
    }

    return serverError(request, "Ошибка при применении исправления", error);
  }
}
