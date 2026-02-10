export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissionsGuard";
import { buildDebtReportPg, hasPgConnection } from "@/lib/office/reporting.pg";

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

export async function GET(request: Request) {
  const guard = await requirePermission(request, "billing.export", {
    route: "/api/office/reports/debts.csv",
  });
  if (guard instanceof Response) return guard;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const street = searchParams.get("street");
  const minDebt = searchParams.get("minDebt");
  const limit = Math.min(1000, Number(searchParams.get("limit") ?? 500));

  if (!hasPgConnection()) {
    return new NextResponse("plot_id,plot_label,debt\n", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"debts.csv\"",
      },
    });
  }

  const report = await buildDebtReportPg({
    period: period || null,
    street: street || null,
    minDebt: minDebt ? Number(minDebt) : null,
    limit,
    offset: 0,
  });

  const lines = ["plot_id,plot_label,debt"];
  report.items.forEach((row) => {
    lines.push([row.plotId, escapeCsv(row.plotLabel), row.debt.toFixed(2)].join(","));
  });

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"debts.csv\"",
    },
  });
}
