export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listAccrualsWithStatus, getPlotLabel } from "@/lib/billing.store";
import { buildAccrualsCsv, type AccrualsCsvRow } from "@/lib/billing/reports.csv";
import { hasPgConnection, exportAccrualsCsv } from "@/lib/billing/reports.pg";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/reports/accruals.csv",
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

  if (hasPgConnection()) {
    const csv = await exportAccrualsCsv({
      period: period || null,
      q: q || null,
      limit,
      offset,
    });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=accruals.csv",
      },
    });
  }

  let all = listAccrualsWithStatus();
  if (period) {
    all = all.filter((row) => row.period === period);
  }
  if (q) {
    const needle = q.toLowerCase();
    all = all.filter((row) => `${row.plotId} ${row.title}`.toLowerCase().includes(needle));
  }
  if (from) {
    const fromTs = new Date(from).getTime();
    all = all.filter((row) => new Date(row.date).getTime() >= fromTs);
  }
  if (to) {
    const toTs = new Date(to).getTime();
    all = all.filter((row) => new Date(row.date).getTime() <= toTs);
  }
  const rows: AccrualsCsvRow[] = all.slice(offset, offset + limit).map((row) => ({
    date: row.date,
    plot: getPlotLabel(row.plotId),
    title: row.title,
    amount: row.amount,
    paid: row.paidAmount ?? 0,
    remaining: row.remaining ?? 0,
    status: row.status ?? "open",
  }));

  const csv = buildAccrualsCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=accruals.csv",
    },
  });
}
