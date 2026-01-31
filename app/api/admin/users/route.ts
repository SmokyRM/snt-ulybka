import { ok, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listUsersPaged } from "@/lib/mockDb";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "admin.manage_users", {
    route: "/api/admin/users",
    deniedReason: "admin.manage_users",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? "20") || 20));
    const offset = (page - 1) * limit;
    const result = listUsersPaged({ q, limit, offset });
    return ok(request, { items: result.items, total: result.total, page, limit });
  } catch (error) {
    return serverError(request, "Ошибка загрузки пользователей", error);
  }
}
