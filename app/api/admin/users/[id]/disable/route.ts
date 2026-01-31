import { ok, badRequest, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { toggleUserDisabled, findUserById } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requirePermission(request, "admin.manage_users", {
    route: "/api/admin/users/[id]/disable",
    deniedReason: "admin.manage_users",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const disabled = Boolean(body.disabled);

    const before = findUserById(params.id);
    if (!before) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }

    const updated = toggleUserDisabled(params.id, disabled);
    if (!updated) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }

    await logAdminAction({
      action: "admin.user.disable_toggle",
      entity: "user",
      entityId: updated.id,
      route: "/api/admin/users/[id]/disable",
      success: true,
      before: { status: before.status },
      after: { status: updated.status },
      headers: request.headers,
      meta: { disabled, actorRole: guard.role },
    });

    return ok(request, { user: updated });
  } catch (error) {
    return serverError(request, "Ошибка изменения статуса", error);
  }
}
