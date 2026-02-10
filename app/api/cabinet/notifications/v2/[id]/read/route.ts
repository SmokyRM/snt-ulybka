export const runtime = "nodejs";

import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { hasPgConnection } from "@/lib/office/notifications.pg";
import { markRead, getUserNotification } from "@/lib/notifications/userNotifications.pg";
import { logAdminAction } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);

  const userId = session.id;
  if (!userId) return forbidden(request);

  try {
    if (!hasPgConnection()) {
      return badRequest(request, "Database not available");
    }

    const notification = await getUserNotification(id, userId);
    if (!notification) {
      return badRequest(request, "Уведомление не найдено");
    }

    const updated = await markRead(id, userId);

    await logAdminAction({
      action: "notification.read",
      entity: "user_notification",
      entityId: id,
      route: `/api/cabinet/notifications/v2/${id}/read`,
      success: true,
      headers: request.headers,
    });

    return ok(request, { notification: updated });
  } catch (error) {
    return serverError(request, "Ошибка отметки прочтения", error);
  }
}
