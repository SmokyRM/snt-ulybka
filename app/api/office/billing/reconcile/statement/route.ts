export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { logAdminAction } from "@/lib/audit";
import { buildReconciliationStatementPg, hasPgConnection } from "@/lib/billing/reconciliationStatement.pg";

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.reconcile", {
    route: "/api/office/billing/reconcile/statement",
  });
  if (guard instanceof Response) return guard;

  try {
    const { searchParams } = new URL(request.url);
    const plotId = searchParams.get("plotId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!plotId || !from || !to) {
      return fail(request, "validation_error", "plotId, from, to обязательны", 400);
    }

    if (!hasPgConnection()) {
      return ok(request, { statement: null });
    }

    const statement = await buildReconciliationStatementPg({ plotId, from, to });
    await logAdminAction({
      action: "reconcile.statement",
      entity: "billing.reconcile",
      entityId: plotId,
      route: "/api/office/billing/reconcile/statement",
      success: true,
      meta: { plotId, from, to },
      headers: request.headers,
    });
    return ok(request, { statement });
  } catch (error) {
    return serverError(request, "Ошибка формирования акта сверки", error);
  }
}
