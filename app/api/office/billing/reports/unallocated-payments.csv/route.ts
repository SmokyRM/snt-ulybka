export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listPaymentsWithStatus, getPlotLabel } from "@/lib/billing.store";
import { buildUnallocatedPaymentsCsv, type UnallocatedPaymentsCsvRow } from "@/lib/billing/reports.csv";
import { hasPgConnection, exportUnallocatedPaymentsCsv } from "@/lib/billing/reports.pg";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/reports/unallocated-payments.csv",
      role: session?.role ?? null,
      userId: session?.id ?? null,
      status: session ? 403 : 401,
      latencyMs: Date.now() - startedAt,
      error: session ? "FORBIDDEN" : "UNAUTHORIZED",
    });
    return NextResponse.json(
      { ok: false, error: { code: session ? "forbidden" : "unauthorized", message: "Forbidden" } },
      { status: session ? 403 : 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? null;
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? "500") || 500));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);

  if (hasPgConnection()) {
    const csv = await exportUnallocatedPaymentsCsv({ period, limit, offset });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=unallocated-payments.csv",
      },
    });
  }

  const rows: UnallocatedPaymentsCsvRow[] = listPaymentsWithStatus()
    .filter((p) => (p.allocationStatus ?? "unallocated") === "unallocated")
    .slice(offset, offset + limit)
    .map((row) => ({
      date: row.date,
      amount: row.amount,
      payer: row.payer ?? "",
      plot: getPlotLabel(row.plotId),
      status: row.status ?? "unmatched",
      remaining: row.remaining ?? 0,
    }));

  const csv = buildUnallocatedPaymentsCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=unallocated-payments.csv",
    },
  });
}
