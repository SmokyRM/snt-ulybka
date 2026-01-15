import "server-only";

type SendTelegramParams = {
  token: string;
  chatId: string;
  text: string;
};

export async function sendTelegramMessage(params: SendTelegramParams): Promise<{ providerMessageId?: string }> {
  const url = `https://api.telegram.org/bot${params.token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: params.chatId, text: params.text }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Telegram error ${res.status}: ${msg.slice(0, 200)}`);
  }
  const data = (await res.json()) as { result?: { message_id?: number } };
  return { providerMessageId: data.result?.message_id ? String(data.result.message_id) : undefined };
}
