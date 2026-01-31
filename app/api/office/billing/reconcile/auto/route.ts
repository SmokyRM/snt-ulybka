import { ok, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { runAutoMatch } from "../helpers";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.reconcile", {
    route: "/api/office/billing/reconcile/auto",
    deniedReason: "billing.reconcile",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : undefined;
    const result = runAutoMatch(limit);
    return ok(request, result);
  } catch (error) {
    return serverError(request, "Ошибка автосопоставления", error);
  }
}
