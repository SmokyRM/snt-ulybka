import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { listNotifications } from "@/server/notifications/internal.store";

export async function GET(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const role = (user.role as Role | undefined) ?? "resident";
    if (!isStaffOrAdmin(role)) {
      return forbidden(request);
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const notifications = listNotifications({
      userId: user.id ?? null,
      role,
      unreadOnly,
      limit: limit && limit > 0 ? limit : undefined,
    });

    return ok(request, {
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    return serverError(request, "Ошибка при получении уведомлений", error);
  }
}
