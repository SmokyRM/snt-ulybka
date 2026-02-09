export const runtime = "nodejs";

import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { getUserPlots } from "@/lib/plots";
import { buildReconciliationStatementPg, hasPgConnection } from "@/lib/billing/reconciliationStatement.pg";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) return unauthorized(request);
  if (!isResidentRole(session.role)) return forbidden(request);

  try {
    const { searchParams } = new URL(request.url);
    const plotId = searchParams.get("plotId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!plotId || !from || !to) {
      return fail(request, "validation_error", "plotId, from, to обязательны", 400);
    }

    const plots = await getUserPlots(session.id);
    const owned = plots.some((plot) => plot.plotId === plotId);
    if (!owned) {
      return fail(request, "not_found", "Не найдено", 404);
    }

    if (!hasPgConnection()) {
      return ok(request, { statement: null });
    }

    const statement = await buildReconciliationStatementPg({ plotId, from, to });
    return ok(request, { statement });
  } catch (error) {
    return serverError(request, "Не удалось сформировать акт сверки", error);
  }
}
