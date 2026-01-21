import { ok, fail, unauthorized, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { sendTelegramMessage } from "@/lib/notifications/telegram";

/**
 * Sprint 5.1: Тестовый endpoint для отправки Telegram сообщения
 */
export async function POST(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user || !user.id) {
      return unauthorized(request);
    }

    const body = await request.json();
    const { chatId } = body;

    if (!chatId || typeof chatId !== "string" || !chatId.trim()) {
      return fail(request, "validation_error", "chatId обязателен", 400);
    }

    const testMessage = `🧪 Тестовое сообщение из СНТ "Улыбка"\n\nЭто тестовое уведомление. Если вы получили это сообщение, значит Telegram уведомления настроены правильно!`;

    const result = await sendTelegramMessage(chatId.trim(), testMessage);

    if (!result) {
      return fail(request, "not_configured", "TELEGRAM_BOT_TOKEN не настроен", 503);
    }

    return ok(request, { messageId: result.providerMessageId });
  } catch (error) {
    return serverError(request, "Ошибка при отправке тестового сообщения", error);
  }
}
