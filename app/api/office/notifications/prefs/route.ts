import { ok, fail, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getUserNotificationPrefs, setUserNotificationPrefs } from "@/server/services/notifications";
import { upsertUserById } from "@/lib/mockDb";

export async function GET(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user || !user.id) {
      return unauthorized(request);
    }

    const prefs = getUserNotificationPrefs(user.id);
    if (!prefs) {
      return fail(request, "not_found", "Настройки уведомлений не найдены", 404);
    }

    return ok(request, { prefs });
  } catch (error) {
    return serverError(request, "Ошибка при получении настроек уведомлений", error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user || !user.id) {
      return unauthorized(request);
    }

    const body = await request.json();
    const { enabled, telegramChatId, events } = body;

    // Sprint 5.1: Сохраняем telegramChatId в User модель
    const normalizedChatId = telegramChatId !== undefined ? (telegramChatId ? String(telegramChatId).trim() : null) : undefined;
    if (normalizedChatId !== undefined) {
      upsertUserById({
        id: user.id,
        telegramChatId: normalizedChatId,
      });
    }

    const updated = setUserNotificationPrefs(user.id, {
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      telegramChatId: normalizedChatId,
      events: events
        ? {
            appealCreated: events.appealCreated !== undefined ? Boolean(events.appealCreated) : undefined,
            appealAssigned: events.appealAssigned !== undefined ? Boolean(events.appealAssigned) : undefined,
            appealOverdue: events.appealOverdue !== undefined ? Boolean(events.appealOverdue) : undefined,
          }
        : undefined,
    });

    return ok(request, { prefs: updated });
  } catch (error) {
    return serverError(request, "Ошибка при обновлении настроек уведомлений", error);
  }
}
