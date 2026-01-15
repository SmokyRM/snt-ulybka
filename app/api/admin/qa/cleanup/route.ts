import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { getAllAppeals } from "@/lib/appeals";
import { verifySameOrigin } from "@/lib/security/verifySameOrigin";
import { rateLimit } from "@/lib/security/rateLimit";
import { getRequestId, setRequestIdHeader } from "@/lib/api/requestId";
import { handleApiError } from "@/lib/api/failClosed";
import fs from "fs/promises";
import path from "path";

const filePath = (name: string) => path.join(process.cwd(), "data", `${name}.json`);

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
    const rateLimitResult = rateLimit(`qa-cleanup-${clientId}`, 2, 1000); // 2 requests per second
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

    const response = NextResponse.json({
      ok: true,
      deleted,
    });
    setRequestIdHeader(response, requestId);
    return response;
  } catch (error) {
    return handleApiError(request, error, 500);
  }
}
