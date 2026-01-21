import "server-only";

import { logStructured } from "@/lib/structuredLogger/node";

type SendTelegramParams = {
  token: string;
  chatId: string;
  text: string;
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 секунда

/**
 * Sprint 5.1: Отправляет сообщение в Telegram с ретраями
 * Используется внутренняя функция с явным токеном
 */
async function sendTelegramMessageInternal(
  params: SendTelegramParams,
  options?: { retries?: number }
): Promise<{ providerMessageId?: string; success: boolean }> {
  const maxRetries = options?.retries ?? MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://api.telegram.org/bot${params.token}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: params.chatId,
          text: params.text,
          parse_mode: "HTML",
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Telegram API error ${res.status}: ${msg.slice(0, 200)}`);
      }

      const data = (await res.json()) as { result?: { message_id?: number } };
      return {
        providerMessageId: data.result?.message_id ? String(data.result.message_id) : undefined,
        success: true,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Ждем перед следующей попыткой (exponential backoff)
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Этот код не должен выполняться, но TypeScript требует возврата
  throw lastError || new Error("Failed to send Telegram message");
}

/**
 * Sprint 5.1: Отправляет сообщение в Telegram
 * Берет TELEGRAM_BOT_TOKEN из env, логирует ошибки структурированно
 * 
 * @param chatId - Telegram chat ID получателя
 * @param text - Текст сообщения
 * @returns Результат отправки или null если токен не настроен
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ providerMessageId?: string; success: boolean } | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  
  // Sprint 5.1: Безопасность - если токена нет, логируем warn и пропускаем отправку
  if (!botToken || !botToken.trim()) {
    if (process.env.NODE_ENV !== "test") {
      logStructured("warn", {
        action: "telegram_send_skipped",
        message: "TELEGRAM_BOT_TOKEN not configured",
        chatId: chatId.substring(0, 10) + "...", // Частичный chatId для логирования (безопасность)
      });
    }
    return null;
  }

  try {
    const result = await sendTelegramMessageInternal({
      token: botToken,
      chatId,
      text,
    });
    
    logStructured("info", {
      action: "telegram_send_success",
      chatId: chatId.substring(0, 10) + "...",
      providerMessageId: result.providerMessageId,
      textLength: text.length,
    });
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Sprint 5.1: Логируем ошибки структурированно
    logStructured("error", {
      action: "telegram_send_failed",
      error: errorMessage,
      chatId: chatId.substring(0, 10) + "...",
      textLength: text.length,
    });
    
    throw error;
  }
}
