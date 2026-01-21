import { badRequest, fail, forbidden, ok, serverError } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { findUserById, setUserStatus } from "@/lib/mockDb";
import { UserStatus } from "@/types/snt";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return forbidden(request, "Недостаточно прав");
  }

  try {
    const body: unknown = await request.json().catch(() => ({}));
    if (typeof body !== "object" || body === null) {
      return badRequest(request, "Некорректные данные");
    }
    const targetIdRaw = (body as Record<string, unknown>).userId;
    const statusRaw = (body as Record<string, unknown>).status;
    const targetIdStr = typeof targetIdRaw === "string" ? targetIdRaw.trim() : "";
    const statusStr = typeof statusRaw === "string" ? statusRaw.trim() : "";
    if (!targetIdStr || !statusStr) {
      return badRequest(request, "Некорректные данные");
    }
    if (!["verified", "rejected", "pending"].includes(statusStr)) {
      return badRequest(request, "Недопустимый статус");
    }

    const target = findUserById(targetIdStr);
    if (!target) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }

    const updated = setUserStatus(targetIdStr, statusStr as UserStatus);
    await logAdminAction({
      action: "update_user_status",
      entity: "user",
      entityId: targetIdStr,
      before: target,
      after: updated,
      headers: request.headers,
    });
    return ok(request, { ok: true, user: updated });
  } catch (error) {
    console.error("Error updating user status:", error);
    return serverError(request, "Ошибка обновления статуса", error);
  }
}
