import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import {
  findUnifiedBillingPeriodById,
  listPeriodAccruals,
  listPlots,
} from "@/lib/mockDb";
import { unauthorized, forbidden, fail } from "@/lib/api/respond";

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Экспорт начислений периода в CSV. Admin + office. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const { periodId } = await params;
    const period = findUnifiedBillingPeriodById(periodId);
    if (!period) return fail(request, "not_found", "Период не найден", 404);

  const accruals = listPeriodAccruals(periodId);
  const plots = listPlots();
  const plotMap = new Map(plots.map((p) => [p.id, p]));

  const periodLabel = period.title || `${period.from}—${period.to}`;

  const header = ["period", "plotId", "personName", "amount", "overrideApplied", "notes"].join(",");
  const rows = accruals.map((a) => {
    const plot = plotMap.get(a.plotId);
    const personName = plot?.ownerFullName ?? "";
    const amount = String(a.amountAccrued);
    const overrideApplied = a.overrideApplied === true ? "yes" : "no";
    const notes = a.note ?? "";
    return [periodLabel, a.plotId, personName, amount, overrideApplied, notes].map(escapeCsvCell).join(",");
  });

    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const filename = `accruals-${(period.title || period.from).replace(/[^a-zA-Z0-9-]/g, "_")}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    // CSV endpoint - can't use serverError as it returns JSON
    return new NextResponse("Internal server error", { status: 500 });
  }
}
