import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logStructured } from "@/lib/structuredLogger/node";
import { confirmSend, isTelegramConfigured } from "@/lib/notificationSender";
import { getRateLimitInfo } from "@/lib/notificationRateLimiter";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const guard = await requirePermission(request, "notifications.send", {
    route: "/api/office/notifications/send/confirm",
    deniedReason: "notifications.send",
  });
  if (guard instanceof Response) return guard;
  const { session } = guard;
  if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const channel = body.channel === "telegram" ? "telegram" : undefined;
    const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : 50;

    // Check if Telegram is configured
    if (channel === "telegram" && !isTelegramConfigured()) {
      return fail(request, "provider_not_configured", "TELEGRAM_BOT_TOKEN не настроен", 400);
    }

    logStructured("info", {
      action: "notification_send_start",
      userId: session.id,
      channel,
      limit,
    });

    const result = await confirmSend({ channel, limit });
    const rateLimitInfo = getRateLimitInfo();

    logStructured("info", {
      action: "notification_send_complete",
      userId: session.id,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      rateLimited: result.rateLimited,
      latencyMs: Date.now() - startedAt,
    });

    return ok(request, {
      ...result,
      rateLimit: {
        maxMessages: rateLimitInfo.maxMessages,
        windowMs: rateLimitInfo.windowMs,
        sentInWindow: rateLimitInfo.sentInWindow,
        remaining: rateLimitInfo.remaining,
        resetInMs: rateLimitInfo.resetInMs,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка отправки уведомлений", error);
  }
}
