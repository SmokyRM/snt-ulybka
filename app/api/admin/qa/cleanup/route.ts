import { getSessionUser } from "@/lib/session.server";
import { getAllAppeals } from "@/lib/appeals";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit } from "@/lib/security/rateLimit";
import fs from "fs/promises";
import path from "path";
import { fail, forbidden, methodNotAllowed, ok, serverError } from "@/lib/api/respond";

const filePath = (name: string) => path.join(process.cwd(), "data", `${name}.json`);

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
    const rateLimitResult = rateLimit(`qa-cleanup-${clientId}`, 2, 1000); // 2 requests per second
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

    const deleted: { appeals: number; announcements: number } = {
      appeals: 0,
      announcements: 0,
    };

    // Удаление QA appeals
    const appeals = await getAllAppeals();
    const qaAppeals = appeals.filter((a) => a.message.includes("[QA] Test appeal"));
    const remainingAppeals = appeals.filter((a) => !a.message.includes("[QA] Test appeal"));

    if (qaAppeals.length > 0) {
      await fs.writeFile(filePath("appeals"), JSON.stringify(remainingAppeals, null, 2), "utf-8");
      deleted.appeals = qaAppeals.length;
    }

    // Удаление QA announcements
    // Читаем напрямую из файла для полного контроля
    const announcementsPath = filePath("announcements");
    try {
      const announcementsRaw = await fs.readFile(announcementsPath, "utf-8");
      const announcements = JSON.parse(announcementsRaw) as Array<{ id: string; title: string }>;
      const qaAnnouncements = announcements.filter((a) => a.title.includes("[QA] Test announcement"));
      const remainingAnnouncements = announcements.filter(
        (a) => !a.title.includes("[QA] Test announcement")
      );

      if (qaAnnouncements.length > 0) {
        await fs.writeFile(
          announcementsPath,
          JSON.stringify(remainingAnnouncements, null, 2),
          "utf-8"
        );
        deleted.announcements = qaAnnouncements.length;
      }
    } catch {
      // Файл не существует или пустой - ничего не удаляем
    }

    return ok(request, { deleted });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
