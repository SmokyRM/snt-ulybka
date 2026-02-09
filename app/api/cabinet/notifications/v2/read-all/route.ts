export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { hasPgConnection } from "@/lib/office/notifications.pg";
import { markAllRead } from "@/lib/notifications/userNotifications.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);

  const userId = session.id;
  if (!userId) return forbidden(request);

  try {
    if (!hasPgConnection()) {
      return ok(request, { marked: 0 });
    }

    const marked = await markAllRead(userId);

    await logAdminAction({
      action: "notification.read_all",
      entity: "user_notification",
      route: "/api/cabinet/notifications/v2/read-all",
      success: true,
      meta: { marked },
      headers: request.headers,
    });

    return ok(request, { marked });
  } catch (error) {
    return serverError(request, "Ошибка отметки прочтения", error);
  }
}
