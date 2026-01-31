import { requirePermission } from "@/lib/permissionsGuard";
import {
  findPaymentImportRowById,
  updatePaymentImportRow,
  findPlotById,
  findPaymentImportById,
  listPaymentImportRows,
  updatePaymentImport,
} from "@/lib/mockDb";
import { ok, badRequest, fail, serverError } from "@/lib/api/respond";

/** Ручная привязка строки к участку. PUT { rowId, plotId }. Admin + office. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission(request, "billing.import", {
      route: "/api/admin/billing/payments/imports/[id]/match",
      deniedReason: "billing.import",
    });
    if (guard instanceof Response) return guard;

    const body = await request.json().catch(() => ({}));
    const { rowId, plotId } = body;

    if (!rowId || !plotId) {
      return badRequest(request, "rowId and plotId required");
    }

    const row = findPaymentImportRowById(rowId);
    if (!row) return fail(request, "not_found", "row not found", 404);

    const plot = findPlotById(plotId);
    if (!plot) return fail(request, "not_found", "plot not found", 404);

    const updated = updatePaymentImportRow(rowId, { matchedPlotId: plotId, matchType: "manual" });
    if (!updated) return serverError(request, "update failed");

    const import_ = findPaymentImportById(row.importId);
    if (import_ && import_.status === "draft") {
      const rows = listPaymentImportRows(row.importId);
      updatePaymentImport(row.importId, {
        matchedRows: rows.filter((r) => r.matchedPlotId).length,
        unmatchedRows: rows.filter((r) => !r.matchedPlotId).length,
      });
    }

    return ok(request, { row: updated, plot: { id: plot.id, plotNumber: plot.plotNumber, street: plot.street, ownerFullName: plot.ownerFullName } });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
