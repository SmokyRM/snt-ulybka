import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { findUserById } from "@/lib/mockDb";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const guard = await requirePermission(request, "admin.manage_users", {
    route: "/api/admin/users/[id]",
    deniedReason: "admin.manage_users",
  });
  if (guard instanceof Response) return guard;

  try {
    const user = findUserById(params.id);
    if (!user) {
      return fail(request, "not_found", "Пользователь не найден", 404);
    }
    return ok(request, { user });
  } catch (error) {
    return serverError(request, "Ошибка загрузки пользователя", error);
  }
}
