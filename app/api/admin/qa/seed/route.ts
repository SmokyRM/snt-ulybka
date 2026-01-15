import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { createAppeal } from "@/lib/appeals";
import { createAnnouncement } from "@/lib/announcementsStore";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit } from "@/lib/security/rateLimit";
import { getRequestId, setRequestIdHeader } from "@/lib/api/requestId";
import { handleApiError } from "@/lib/api/failClosed";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  
  try {
    // Fail-closed: проверка метода
    if (request.method !== "POST") {
      const response = NextResponse.json(
        { error: "Method not allowed" },
        { status: 405, headers: { Allow: "POST" } }
      );
      setRequestIdHeader(response, requestId);
      return response;
    }

    // Fail-closed: только dev + ENABLE_QA
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_QA !== "true") {
      const response = NextResponse.json({ error: "not_found" }, { status: 404 });
      setRequestIdHeader(response, requestId);
      return response;
    }

    // CSRF защита
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      const response = NextResponse.json(
        { error: "Запрос отклонён по политике безопасности (origin)." },
        { status: 403 }
      );
      setRequestIdHeader(response, requestId);
      return response;
    }

    // Rate limiting (dev-only, для QA endpoints) - 2 req/sec на ip+path
    const clientId = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const rateLimitResult = rateLimit(`qa-seed-${clientId}`, 2, 1000); // 2 requests per second
    if (!rateLimitResult.ok) {
      const retryAfter = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000);
      const response = NextResponse.json(
        { error: "Превышен лимит запросов. Попробуйте позже." },
        { 
          status: 429,
          headers: { "Retry-After": String(retryAfter) }
        }
      );
      setRequestIdHeader(response, requestId);
      return response;
    }

    // Fail-closed: проверка авторизации
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      const response = NextResponse.json({ error: "not_found" }, { status: 404 });
      setRequestIdHeader(response, requestId);
      return response;
    }

  const body = await request.json().catch(() => ({}));
  const create = Array.isArray(body.create) ? body.create : [];
  const openAfter = typeof body.openAfter === "boolean" ? body.openAfter : false;

  const timestamp = new Date().toISOString();
  const timestampShort = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);

  const result: {
    appeal?: { id: string; url: string };
    announcement?: { id: string; url: string };
  } = {};

  // Создание appeal
  if (create.includes("appeal")) {
    const userId = session.id || "user-admin-root";
    const message = `[QA] Test appeal ${timestampShort}\n\nЭто тестовое обращение, созданное через QA генератор.`;
    const appeal = await createAppeal(userId, message, "Общее");
    if (appeal) {
      result.appeal = {
        id: appeal.id,
        url: `/cabinet/appeals/${appeal.id}`,
      };
    }
  }

  // Создание announcement (используем оба варианта для покрытия)
  if (create.includes("announcement")) {
    // Создаем через announcementsStore (admin вариант)
    const announcement = await createAnnouncement({
      title: `[QA] Test announcement ${timestampShort}`,
      body: "Это тестовое объявление, созданное через QA генератор.",
      status: "published",
      isImportant: false,
      audience: "all",
      createdBy: session.id || "admin",
    });

    result.announcement = {
      id: announcement.id,
      url: `/admin/announcements`,
    };
  }

    const response = NextResponse.json({
      created: result,
      openAfter,
    });
    setRequestIdHeader(response, requestId);
    return response;
  } catch (error) {
    return handleApiError(request, error, 500);
  }
}
