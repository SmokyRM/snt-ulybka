import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasAdminAccess } from "@/lib/session.server";
import { generateDailyDigestData, formatDailyDigest } from "@/server/services/digest";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
// Получаем chatId для роли из env (TELEGRAM_CHAT_ID_<ROLE>)
function getChatIdForRole(role: Role): string | null {
  const envKey = `TELEGRAM_CHAT_ID_${role.toUpperCase()}`;
  const chatId = process.env[envKey]?.trim();
  return chatId || null;
}
import { logActivity } from "@/lib/activityLog.store";

/**
 * Sprint 7.4: Daily digest (manual trigger first)
 * Endpoint для ручного запуска ежедневного дайджеста
 */

export async function POST(request: Request) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    return unauthorized(request);
  }

  // RBAC: только admin может запускать дайджест вручную
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const roleParam = body.role as string | undefined;
    const role = roleParam as Role | undefined;

    // Валидация роли
    const validRoles: Role[] = ["admin", "chairman", "secretary", "accountant"];
    if (role && !validRoles.includes(role)) {
      return badRequest(request, "invalid_role");
    }

    // Если роль не указана, отправляем всем ролям
    const rolesToSend = role ? [role] : validRoles;

    const results: Array<{
      role: Role;
      sent: number;
      failed: number;
      recipients: Array<{ userId?: string; chatId?: string; success: boolean; error?: string; providerMessageId?: string }>;
    }> = [];

    // Отправляем дайджест для каждой роли
    for (const targetRole of rolesToSend) {
      const chatId = getChatIdForRole(targetRole);
      if (!chatId) {
        // Нет chatId для роли - пропускаем
        results.push({
          role: targetRole,
          sent: 0,
          failed: 0,
          recipients: [{ success: false, error: "chat_id_not_configured" }],
        });
        continue;
      }

      // Генерируем данные дайджеста для роли (используем первую попавшуюся userId с этой ролью)
      // В реальности можно использовать конкретного пользователя или роль
      const { getDb } = await import("@/lib/mockDb");
      const db = getDb();
      const roleUser = db.users.find((u) => u.role === targetRole);
      const userId = roleUser?.id ?? "";

      try {
        // Генерируем данные дайджеста (используем userId если есть)
        const digestData = userId ? generateDailyDigestData(userId, targetRole) : {
          myOpen: 0,
          overdue: 0,
          dueSoon: 0,
          newToday: 0,
        };

        // Форматируем дайджест
        const digestText = formatDailyDigest(targetRole, digestData);

        // Отправляем в Telegram
        const result = await sendTelegramMessage(chatId, digestText);

        if (!result) {
          // Не удалось отправить
          results.push({
            role: targetRole,
            sent: 0,
            failed: 1,
            recipients: [{ chatId: chatId.substring(0, 10) + "...", success: false, error: "telegram_send_failed" }],
          });

          // Логируем ошибку
          await logActivity({
            actorUserId: user.id ?? null,
            actorRole: user.role ?? null,
            entityType: "notification",
            entityId: `digest_${targetRole}_${Date.now()}`,
            action: "digest.sent",
            meta: {
              channel: "telegram",
              role: targetRole,
              chatId: chatId.substring(0, 10) + "...",
              success: false,
              error: "telegram_send_failed",
              counts: digestData,
            },
          });

          continue;
        }

        // Логируем успешную отправку
        await logActivity({
          actorUserId: user.id ?? null,
          actorRole: user.role ?? null,
          entityType: "notification",
          entityId: `digest_${targetRole}_${Date.now()}`,
          action: "digest.sent",
          meta: {
            channel: "telegram",
            role: targetRole,
            chatId: chatId.substring(0, 10) + "...",
            providerMessageId: result.providerMessageId,
            success: true,
            counts: digestData,
          },
        });

        results.push({
          role: targetRole,
          sent: 1,
          failed: 0,
          recipients: [
            {
              chatId: chatId.substring(0, 10) + "...",
              success: true,
              providerMessageId: result.providerMessageId,
            },
          ],
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Логируем ошибку
        await logActivity({
          actorUserId: user.id ?? null,
          actorRole: user.role ?? null,
          entityType: "notification",
          entityId: `digest_${targetRole}_${Date.now()}`,
          action: "digest.sent",
          meta: {
            channel: "telegram",
            role: targetRole,
            chatId: chatId.substring(0, 10) + "...",
            success: false,
            error: errorMessage,
          },
        });

        results.push({
          role: targetRole,
          sent: 0,
          failed: 1,
          recipients: [{ chatId: chatId.substring(0, 10) + "...", success: false, error: errorMessage }],
        });
      }
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    return ok(request, {
      ok: true,
      results,
      total: {
        sent: totalSent,
        failed: totalFailed,
      },
    });
  } catch (error) {
    console.error("Error sending digest:", error);
    return serverError(request, "Ошибка отправки дайджеста", error);
  }
}
