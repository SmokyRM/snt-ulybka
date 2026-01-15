import { NextResponse } from "next/server";
import { APPEAL_TOPICS, checkAppealRateLimit, createAppeal } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";
import { failClosed, handleApiError } from "@/lib/api/failClosed";
import { getRequestId, setRequestIdHeader } from "@/lib/api/requestId";

export async function POST(request: Request) {
  try {
    // Fail-closed: проверка метода
    const methodCheck = await failClosed(request, {
      allowedMethods: ["POST"],
      requireAuth: true,
    });
    if (methodCheck) return methodCheck;

    const user = await getSessionUser();
    const requestId = getRequestId(request);
    
    if (!user || !user.id) {
      const response = NextResponse.json({ error: "unauthorized" }, { status: 401 });
      setRequestIdHeader(response, requestId);
      return response;
    }
    
    const body = await request.json().catch(() => ({}));
    const topic = typeof body.topic === "string" ? body.topic : "Общее";
    const message = typeof body.message === "string" ? body.message : "";
    const trimmed = message.trim();
    
    if (!checkAppealRateLimit(user.id)) {
      const response = NextResponse.json(
        { error: "rate_limited", message: "Слишком много обращений. Попробуйте позже." },
        { status: 429 },
      );
      setRequestIdHeader(response, requestId);
      return response;
    }
    
    if (!trimmed || trimmed.length < 10 || trimmed.length > 4000) {
      const response = NextResponse.json(
        { error: "validation", message: "Сообщение должно быть от 10 до 4000 символов." },
        { status: 400 },
      );
      setRequestIdHeader(response, requestId);
      return response;
    }
    
    if (!APPEAL_TOPICS.includes(topic)) {
      const response = NextResponse.json({ error: "validation", message: "Некорректная тема." }, { status: 400 });
      setRequestIdHeader(response, requestId);
      return response;
    }
    
    const appeal = await createAppeal(user.id, trimmed, topic);
    const response = NextResponse.json({ ok: true, appeal });
    setRequestIdHeader(response, requestId);
    return response;
  } catch (error) {
    return handleApiError(request, error, 500);
  }
}
