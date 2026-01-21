import { APPEAL_TOPICS, checkAppealRateLimit, createAppeal } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";
import { methodNotAllowed, ok, fail, unauthorized, serverError } from "@/lib/api/respond";
import { getRequestId } from "@/lib/api/requestId";
import { logApiRequest } from "@/lib/structuredLogger/node";

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;
  
  try {
    if (request.method !== "POST") {
      const latencyMs = Date.now() - startTime;
      logApiRequest({
        path: pathname,
        method: request.method,
        role: null,
        userId: null,
        status: 405,
        latencyMs,
        requestId,
      });
      return methodNotAllowed(request, ["POST"]);
    }

    const user = await getSessionUser();
    
    if (!user || !user.id) {
      const latencyMs = Date.now() - startTime;
      logApiRequest({
        path: pathname,
        method: "POST",
        role: null,
        userId: null,
        status: 401,
        latencyMs,
        requestId,
      });
      return unauthorized(request);
    }
    
    const body = await request.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic : "Общее";
    const message = typeof body.message === "string" ? body.message : "";
    const trimmed = message.trim();
    
    if (!checkAppealRateLimit(user.id)) {
      return fail(request, "rate_limited", "Слишком много обращений. Попробуйте позже.", 429);
    }
    
    if (!trimmed || trimmed.length < 10 || trimmed.length > 4000) {
      return fail(request, "validation_error", "Сообщение должно быть от 10 до 4000 символов.", 400);
    }
    
    if (!APPEAL_TOPICS.includes(topic)) {
      return fail(request, "validation_error", "Некорректная тема.", 400);
    }
    
    const appeal = await createAppeal(user.id, trimmed, topic);
    const latencyMs = Date.now() - startTime;
    logApiRequest({
      path: pathname,
      method: "POST",
      role: user.role ?? null,
      userId: user.id,
      status: 200,
      latencyMs,
      requestId,
    });
    return ok(request, { appeal });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const user = await getSessionUser().catch(() => null);
    logApiRequest({
      path: pathname,
      method: "POST",
      role: user?.role ?? null,
      userId: user?.id ?? null,
      status: 500,
      latencyMs,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return serverError(request, "Произошла внутренняя ошибка", error);
  }
}
