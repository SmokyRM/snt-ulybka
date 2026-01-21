import { NextResponse } from "next/server";
import { sendDailyDigest } from "@/server/services/notifications";
import type { Role } from "@/lib/permissions";

/**
 * Sprint 5.3: Cron job для ежедневного дайджеста
 * 
 * Запускается через Vercel Cron (см. vercel.json) - автоматически в 9:00 UTC каждый день
 * Или можно вызвать вручную через GET/POST запрос с правильным Authorization заголовком
 * 
 * Отправляет дайджест для ролей: secretary, accountant, chairman
 * 
 * Инструкция по настройке cron (если не используется Vercel Cron):
 * 
 * 1. Установите переменную окружения CRON_SECRET:
 *    export CRON_SECRET="your-secret-token-here"
 * 
 * 2. Настройте cron задачу (например, через crontab):
 *    # Каждый день в 9:00 UTC (12:00 МСК)
 *    0 9 * * * curl -X GET "https://your-domain.com/api/cron/daily-digest" \
 *      -H "Authorization: Bearer your-secret-token-here"
 * 
 * 3. Или используйте внешний сервис (например, cron-job.org):
 *    - URL: https://your-domain.com/api/cron/daily-digest
 *    - Method: GET
 *    - Headers: Authorization: Bearer your-secret-token-here
 *    - Schedule: Daily at 9:00 UTC
 * 
 * Для локального тестирования:
 *    curl -X GET "http://localhost:3000/api/cron/daily-digest" \
 *      -H "Authorization: Bearer your-secret-token-here"
 */
export async function GET(request: Request) {
  // Sprint 5.3: Проверка авторизации для cron job
  // Vercel Cron автоматически добавляет заголовок 'x-vercel-cron' или можно использовать секретный токен
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";

  // В production требуем авторизацию (кроме Vercel Cron)
  // Sprint 5.3: В dev режиме также требуем CRON_SECRET для безопасности
  if (!isVercelCron) {
    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const roles: Role[] = ["secretary", "accountant", "chairman"];
  const results: Record<string, { sent: number; failed: number }> = {};

  try {
    // Отправляем дайджест для каждой роли
    for (const role of roles) {
      try {
        const result = await sendDailyDigest(role);
        results[role] = result;
      } catch (error) {
        console.error(`[cron] Failed to send digest for role ${role}:`, error);
        results[role] = { sent: 0, failed: 0 };
      }
    }

    const totalSent = Object.values(results).reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalSent,
        totalFailed,
      },
    });
  } catch (error) {
    console.error("[cron] Daily digest error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST также поддерживается для ручного запуска
export const POST = GET;
