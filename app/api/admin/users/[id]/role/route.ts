import { ok, badRequest, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updateUserRole, findUserById } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import type { UserRole } from "@/types/snt";

const allowedRoles: UserRole[] = ["resident", "secretary", "accountant", "chairman", "admin"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const guard = await requirePermission(request, "admin.manage_users", {
    route: "/api/admin/users/[id]/role",
    deniedReason: "admin.manage_users",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const role = body.role as UserRole | undefined;
    if (!role || !allowedRoles.includes(role)) {
      return badRequest(request, "Недопустимая роль");
    }

    const before = findUserById(params.id);
    if (!before) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }

    const updated = updateUserRole(params.id, role);
    if (!updated) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }

    await logAdminAction({
      action: "admin.user.role_change",
      entity: "user",
      entityId: updated.id,
      route: "/api/admin/users/[id]/role",
      success: true,
      before: { role: before.role },
      after: { role: updated.role },
      headers: request.headers,
      meta: { actorRole: guard.role },
    });

    return ok(request, { user: updated });
  } catch (error) {
    return serverError(request, "Ошибка изменения роли", error);
  }
}
