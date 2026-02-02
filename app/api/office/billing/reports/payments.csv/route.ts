export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listPaymentsWithStatus, getPlotLabel } from "@/lib/billing.store";
import { buildPaymentsCsv, type PaymentsCsvRow } from "@/lib/billing/reports.csv";
import { hasPgConnection, exportPaymentsCsv } from "@/lib/billing/reports.pg";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/reports/payments.csv",
      role: session?.role ?? null,
      userId: session?.id ?? null,
      status: session ? 403 : 401,
      latencyMs: Date.now() - startedAt,
      error: session ? "FORBIDDEN" : "UNAUTHORIZED",
    });
    return NextResponse.json({ ok: false, error: { code: session ? "forbidden" : "unauthorized", message: "Forbidden" } }, { status: session ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "";
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? "500") || 500));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);
  const from = searchParams.get("from") ?? null;
  const to = searchParams.get("to") ?? null;

  const buildPeriodRange = (value: string) => {
    if (!value) return null;
    const [year, month] = value.split("-");
    if (!year || !month) return null;
    const start = `${year}-${month}-01`;
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    endDate.setUTCDate(0);
    return { from: start, to: endDate.toISOString().slice(0, 10) };
  };

  const periodRange = period ? buildPeriodRange(period) : null;
  const effectiveFrom = periodRange?.from ?? from;
  const effectiveTo = periodRange?.to ?? to;

  if (hasPgConnection()) {
    const csv = await exportPaymentsCsv({
      period: period || null,
      q: q || null,
      from: effectiveFrom,
      to: effectiveTo,
      limit,
      offset,
    });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=payments.csv",
      },
    });
  }

  const all = listPaymentsWithStatus({ from: effectiveFrom, to: effectiveTo, q: q || null });
  const rows: PaymentsCsvRow[] = all.slice(offset, offset + limit).map((row) => ({
    date: row.date,
    amount: row.amount,
    payer: row.payer ?? "",
    plot: getPlotLabel(row.plotId),
    status: row.allocationStatus ?? "unallocated",
    allocated: row.allocatedAmount ?? 0,
    remaining: row.remaining ?? 0,
  }));

  const csv = buildPaymentsCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=payments.csv",
    },
  });
}
