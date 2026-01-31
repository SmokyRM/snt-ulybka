import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { previewSend, isTelegramConfigured } from "@/lib/notificationSender";
import { getRateLimitInfo } from "@/lib/notificationRateLimiter";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "notifications.send", {
    route: "/api/office/notifications/send/preview",
    deniedReason: "notifications.send",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const channel = body.channel === "telegram" ? "telegram" : undefined;
    const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : 50;

    const preview = previewSend({ channel, limit });
    const rateLimitInfo = getRateLimitInfo();
    const telegramConfigured = isTelegramConfigured();

    return ok(request, {
      ...preview,
      telegramConfigured,
      rateLimit: {
        maxMessages: rateLimitInfo.maxMessages,
        windowMs: rateLimitInfo.windowMs,
        sentInWindow: rateLimitInfo.sentInWindow,
        remaining: rateLimitInfo.remaining,
        resetInMs: rateLimitInfo.resetInMs,
      },
    });
  } catch (error) {
    return serverError(request, "Ошибка предпросмотра отправки", error);
  }
}
