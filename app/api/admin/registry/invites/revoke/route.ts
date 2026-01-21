import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { revokeInviteCode, getInviteCodeByPersonId, listInviteCodes } from "@/lib/registry/core/inviteCodes.store";
import { logAdminAction } from "@/lib/audit";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const role = user?.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request, "Недостаточно прав");
  }

  const body = (await request.json().catch(() => ({}))) as { personId?: string; codeId?: string };
  const personId = typeof body.personId === "string" ? body.personId.trim() : "";
  const codeId = typeof body.codeId === "string" ? body.codeId.trim() : "";

  if (!personId && !codeId) {
    return fail(request, "validation_error", "Не указан personId или codeId", 400);
  }

  try {
    let targetCodeId = codeId;
    
    // If personId provided, find the code
    if (!targetCodeId && personId) {
      const code = getInviteCodeByPersonId(personId);
      if (!code) {
        return fail(request, "not_found", "Код не найден для данного человека", 404);
      }
      targetCodeId = code.id;
    }

    if (!targetCodeId) {
      return fail(request, "not_found", "Код не найден", 404);
    }

    const codes = listInviteCodes({ personId: personId || undefined });
    const before = codes.find((c) => c.id === targetCodeId);

    const revoked = revokeInviteCode(targetCodeId);
    if (!revoked) {
      return serverError(request, "Не удалось отозвать код");
    }

    await logAdminAction({
      action: "revoke_invite_code",
      entity: "invite_code",
      entityId: targetCodeId,
      before,
      after: null,
      headers: request.headers,
    });

    return ok(request, {});
  } catch (error) {
    console.error("Error revoking invite code:", error);
    return serverError(request, "Ошибка отзыва кода", error);
  }
}
