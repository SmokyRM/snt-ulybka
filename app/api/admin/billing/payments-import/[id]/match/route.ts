import { requirePermission } from "@/lib/permissionsGuard";
import { ok, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  findPaymentImportRowById,
  updatePaymentImportRow,
  findPlotById,
  findPaymentImportById,
  listPaymentImportRows,
  updatePaymentImport,
} from "@/lib/mockDb";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission(request, "billing.import", {
    route: "/api/admin/billing/payments-import/[id]/match",
    deniedReason: "billing.import",
  });
  if (guard instanceof Response) return guard;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { rowId, plotId } = body;

  if (!rowId || !plotId) {
    return badRequest(request, "rowId and plotId are required");
  }

  const row = findPaymentImportRowById(rowId);
  if (!row) {
    return fail(request, "not_found", "row not found", 404);
  }

  const plot = findPlotById(plotId);
  if (!plot) {
    return fail(request, "not_found", "plot not found", 404);
  }

  const updated = updatePaymentImportRow(rowId, {
    matchedPlotId: plotId,
    matchType: "manual",
  });

  if (!updated) {
    return serverError(request, "failed to update");
  }

  // Update import stats
  const import_ = findPaymentImportById(row.importId);
  if (import_ && import_.status === "draft") {
    const rows = listPaymentImportRows(row.importId);
    const matchedCount = rows.filter((r) => r.matchedPlotId).length;
    const unmatchedCount = rows.length - matchedCount;
    updatePaymentImport(row.importId, {
      matchedRows: matchedCount,
      unmatchedRows: unmatchedCount,
    });
  }

  return ok(request, {
    row: updated,
    plot: {
      id: plot.id,
      plotNumber: plot.plotNumber,
      street: plot.street,
      ownerFullName: plot.ownerFullName,
    },
  });
}
