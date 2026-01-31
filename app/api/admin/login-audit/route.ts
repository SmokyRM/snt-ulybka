import { ok, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { listLoginAudit } from "@/lib/loginAudit.store";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "admin.manage_users", {
    route: "/api/admin/login-audit",
    deniedReason: "admin.manage_users",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const role = searchParams.get("role");
    const successParam = searchParams.get("success");
    const success = successParam === null ? null : successParam === "1";
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") ?? "20") || 20));
    const offset = (page - 1) * limit;

    const result = listLoginAudit({ from, to, role, success, limit, offset });
    return ok(request, { items: result.items, total: result.total, page, limit });
  } catch (error) {
    return serverError(request, "Ошибка загрузки аудита", error);
  }
}
