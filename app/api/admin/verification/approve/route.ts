import { badRequest, fail, forbidden, ok, serverError } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { findUserById, setUserStatus, upsertUser } from "@/lib/mockDb";
import { updatePerson } from "@/lib/registry/core/persons.store";
import { logAdminAction } from "@/lib/audit";
import type { UserStatus } from "@/types/snt";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const role = user?.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request, "Недостаточно прав");
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return badRequest(request, "Не указан userId");
  }

  try {
    const targetUser = findUserById(userId);
    if (!targetUser) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }

    if (targetUser.status !== "pending_verification") {
      return badRequest(request, "Пользователь не находится в статусе ожидания верификации");
    }

    const before = { ...targetUser };

    // Update user status to verified
    const updatedUser = setUserStatus(userId, "verified" as UserStatus);
    if (!updatedUser) {
      return serverError(request, "Не удалось обновить статус пользователя");
    }

    // Link user to person if pendingPersonId exists
    if (targetUser.pendingPersonId) {
      updatePerson(targetUser.pendingPersonId, {
        userId: userId,
        verificationStatus: "verified",
      });
      
      // Clear pendingPersonId
      upsertUser({
        contact: targetUser.phone || targetUser.email || "",
        pendingPersonId: null,
      });
    }

    await logAdminAction({
      action: "approve_verification",
      entity: "user",
      entityId: userId,
      before,
      after: updatedUser,
      headers: request.headers,
    });

    return ok(request, { ok: true, user: updatedUser });
  } catch (error) {
    console.error("Error approving verification:", error);
    return serverError(request, "Ошибка подтверждения", error);
  }
}
