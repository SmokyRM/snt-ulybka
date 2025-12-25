import https from "https";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

export async function sendTelegramMessage(text: string) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured");
  }
  const payload = JSON.stringify({
    chat_id: ADMIN_CHAT_ID,
    text,
    parse_mode: "HTML",
  });

  return new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${BOT_TOKEN}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Telegram API error: ${res.statusCode ?? "unknown"}`));
        }
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}
