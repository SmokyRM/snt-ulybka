import { getSessionUser } from "@/lib/session.server";
import { createAppeal } from "@/lib/appeals";
import { createAnnouncement } from "@/lib/announcementsStore";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit } from "@/lib/security/rateLimit";
import { fail, forbidden, methodNotAllowed, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  try {
    // Fail-closed: проверка метода
    if (request.method !== "POST") {
      return methodNotAllowed(request, ["POST"]);
    }

    // Fail-closed: только dev + ENABLE_QA
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_QA !== "true") {
      return fail(request, "not_found", "not_found", 404);
    }

    // CSRF защита
    const originCheck = verifySameOrigin(request);
    if (!originCheck.ok) {
      return forbidden(request, "Запрос отклонён по политике безопасности (origin).");
    }

    // Rate limiting (dev-only, для QA endpoints) - 2 req/sec на ip+path
    const clientId = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const rateLimitResult = rateLimit(`qa-seed-${clientId}`, 2, 1000); // 2 requests per second
    if (!rateLimitResult.ok) {
      const retryAfter = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000);
      return fail(
        request,
        "rate_limited",
        "Превышен лимит запросов. Попробуйте позже.",
        429,
        undefined,
        { headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Fail-closed: проверка авторизации
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return fail(request, "not_found", "not_found", 404);
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

    return ok(request, {
      created: result,
      openAfter,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
