export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { hasPgConnection } from "@/lib/office/notifications.pg";
import {
  listUserNotifications,
  getUnreadCount,
} from "@/lib/notifications/userNotifications.pg";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);

  // Both residents and staff can view their notifications
  const userId = session.id;
  if (!userId) return forbidden(request);

  try {
    if (!hasPgConnection()) {
      return ok(request, { notifications: [], unreadCount: 0 });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

    const notifications = await listUserNotifications(userId, { limit, cursor });
    const unreadCount = await getUnreadCount(userId);

    return ok(request, { notifications, unreadCount });
  } catch (error) {
    return serverError(request, "Не удалось загрузить уведомления", error);
  }
}
