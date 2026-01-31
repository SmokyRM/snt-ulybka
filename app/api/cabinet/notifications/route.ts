import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { buildResidentNotifications } from "@/lib/resident/notifications.server";
import { isResidentRole } from "@/lib/rbac";
import { getEffectiveSessionUser } from "@/lib/session.server";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  try {
    const notifications = buildResidentNotifications(session.id);
    return ok(request, { notifications, count: notifications.length });
  } catch (error) {
    return serverError(request, "Не удалось загрузить уведомления", error);
  }
}
