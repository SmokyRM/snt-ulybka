import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import {
  findPaymentImportById,
  listPaymentImportRows,
  findPlotById,
  listUsers,
} from "@/lib/mockDb";
import { ok, unauthorized, forbidden, fail, serverError } from "@/lib/api/respond";

/** Деталка импорта: статистика, строки. Admin + office. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { id } = await params;
    const import_ = findPaymentImportById(id);
    if (!import_) return fail(request, "not_found", "import not found", 404);

  const rows = listPaymentImportRows(id);
  const users = listUsers(1000);

  const enrichedRows = rows.map((row) => {
    const plot = row.matchedPlotId ? findPlotById(row.matchedPlotId) : null;
    return {
      ...row,
      plot: plot ? { id: plot.id, plotNumber: plot.plotNumber, street: plot.street, ownerFullName: plot.ownerFullName } : null,
    };
  });

  const createdBy = import_.createdByUserId ? users.find((u) => u.id === import_.createdByUserId) : null;
  const appliedBy = import_.appliedByUserId ? users.find((u) => u.id === import_.appliedByUserId) : null;

  const stats = {
    total: rows.length,
    matched: rows.filter((r) => r.matchedPlotId).length,
    unmatched: rows.filter((r) => !r.matchedPlotId).length,
    withErrors: rows.filter((r) => r.validationErrors && r.validationErrors.length > 0).length,
    applied: rows.filter((r) => r.paymentId).length,
  };

    return ok(request, {
      import: {
        ...import_,
        createdByName: createdBy?.email ?? createdBy?.fullName ?? "—",
        appliedByName: appliedBy?.email ?? appliedBy?.fullName ?? null,
      },
      rows: enrichedRows,
      stats,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
