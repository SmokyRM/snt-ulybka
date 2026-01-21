import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { createInviteCode } from "@/lib/registry/core/inviteCodes.store";
import { logAdminAction } from "@/lib/audit";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const role = user?.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request, "Недостаточно прав");
  }

  const body = (await request.json().catch(() => ({}))) as { personId?: string };
  const personId = typeof body.personId === "string" ? body.personId.trim() : "";

  if (!personId) {
    return fail(request, "validation_error", "Не указан personId", 400);
  }

  try {
    const { code, inviteCode } = createInviteCode(personId);
    
    await logAdminAction({
      action: "generate_invite_code",
      entity: "invite_code",
      entityId: inviteCode.id,
      after: { personId, codeId: inviteCode.id },
      headers: request.headers,
    });

    return ok(request, { code, inviteCode });
  } catch (error) {
    console.error("Error generating invite code:", error);
    return serverError(request, "Ошибка генерации кода", error);
  }
}
