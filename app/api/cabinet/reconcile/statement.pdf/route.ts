export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isResidentRole } from "@/lib/rbac";
import { getUserPlots } from "@/lib/plots";
import { buildReconciliationStatementPg, hasPgConnection } from "@/lib/billing/reconciliationStatement.pg";
import { createSimplePdf } from "@/lib/simplePdf";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session || !isResidentRole(session.role)) {
    return new NextResponse("Forbidden", { status: session ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  const plotId = searchParams.get("plotId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!plotId || !from || !to) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const plots = await getUserPlots(session.id);
  const owned = plots.some((plot) => plot.plotId === plotId);
  if (!owned) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!hasPgConnection()) {
    return new NextResponse("PG not configured", { status: 503 });
  }

  const statement = await buildReconciliationStatementPg({ plotId, from, to });
  const lines: string[] = [];
  lines.push(`Акт сверки: ${statement.plotLabel}`);
  lines.push(`Период: ${from} — ${to}`);
  lines.push("");
  lines.push(`Начислено: ${statement.totals.accrued}`);
  lines.push(`Оплачено: ${statement.totals.paid}`);
  lines.push(`Долг: ${statement.totals.debt}`);
  lines.push(`Переплата: ${statement.totals.overpay}`);

  const pdf = createSimplePdf([lines]);
  const filename = `reconciliation-${plotId}-${from}-${to}.pdf`.replace(/[^a-zA-Z0-9-_\\.]/g, "_");
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
