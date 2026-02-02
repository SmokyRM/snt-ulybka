export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listDebts } from "@/lib/billing.store";
import { buildDebtorsCsv, type DebtorsCsvRow } from "@/lib/billing/reports.csv";
import { hasPgConnection, exportDebtorsCsv } from "@/lib/billing/reports.pg";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/reports/debtors.csv",
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
  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const resolvedPeriod = period || defaultPeriod;

  if (hasPgConnection()) {
    const csv = await exportDebtorsCsv({
      period: resolvedPeriod,
      q: q || null,
      limit,
      offset,
    });
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=debtors.csv",
      },
    });
  }

  const all = listDebts({ q: q || null });
  const rows: DebtorsCsvRow[] = all.slice(offset, offset + limit).map((row) => ({
    plot: row.plotId,
    resident: row.residentName,
    charged: row.chargedTotal,
    paid: row.paidTotal,
    debt: row.debt,
  }));

  const csv = buildDebtorsCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=debtors.csv",
    },
  });
}
