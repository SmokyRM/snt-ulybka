import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { markRead } from "@/server/notifications/internal.store";

export async function POST(request: Request) {
  try {
    const user = await getEffectiveSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const role = (user.role as Role | undefined) ?? "resident";
    if (!isStaffOrAdmin(role)) {
      return forbidden(request);
    }

    const body = await request.json().catch(() => ({}));
    const notificationId = typeof body.id === "string" ? body.id : null;

    if (!notificationId) {
      return fail(request, "validation_error", "ID уведомления обязателен", 400);
    }

    if (!user.id) {
      return fail(request, "validation_error", "ID пользователя обязателен", 400);
    }

    const updated = markRead(notificationId, user.id);
    if (!updated) {
      return fail(request, "not_found", "Уведомление не найдено", 404);
    }

    return ok(request, {
      notification: updated,
    });
  } catch (error) {
    return serverError(request, "Ошибка при отметке уведомления как прочитанного", error);
  }
}
