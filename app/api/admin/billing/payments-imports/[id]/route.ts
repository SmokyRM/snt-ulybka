import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { ok, unauthorized, forbidden, fail } from "@/lib/api/respond";
import {
  findPaymentImportById,
  listPaymentImportRows,
  findPlotById,
  listUsers,
  listAuditLogs,
} from "@/lib/mockDb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    return forbidden(request);
  }

  const { id } = await params;
  const import_ = findPaymentImportById(id);
  if (!import_) {
    return fail(request, "not_found", "import not found", 404);
  }

  const rows = listPaymentImportRows(id);
  const users = listUsers(1000); // Get all users for name lookup

  // Enrich rows with plot details
  const enrichedRows = rows.map((row) => {
    const plot = row.matchedPlotId ? findPlotById(row.matchedPlotId) : null;
    return {
      ...row,
      plot: plot
        ? {
            id: plot.id,
            plotNumber: plot.plotNumber,
            street: plot.street,
            ownerFullName: plot.ownerFullName,
          }
        : null,
    };
  });

  // Get audit logs for this import
  const auditLogs = listAuditLogs({
    entity: "payment_import",
    entityId: id,
  });

  const createdBy = import_.createdByUserId ? users.find((u) => u.id === import_.createdByUserId) : null;
  const appliedBy = import_.appliedByUserId ? users.find((u) => u.id === import_.appliedByUserId) : null;

  // Calculate statistics
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
      createdByName: createdBy?.email || "Неизвестно",
      appliedByName: appliedBy?.email || null,
    },
    rows: enrichedRows,
    stats,
    auditLogs: auditLogs.map((log) => {
      const meta = log.meta || {};
      const actorUser = meta.actorUserId
        ? users.find((u) => u.id === (meta.actorUserId as string))
        : null;
      return {
        id: log.id,
        action: log.action,
        actorName: actorUser?.email || (meta.actorUserId as string) || "Система",
        actorRole: (meta.actorRole as string) || null,
        createdAt: log.createdAt,
        before: log.before,
        after: log.after,
      };
    }),
  });
}
