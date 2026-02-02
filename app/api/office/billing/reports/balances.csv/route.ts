export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listPlotBalances } from "@/lib/billing.store";
import { hasPgConnection, listBalances as listBalancesPg } from "@/lib/billing/reconcile.pg";

const escapeCsv = (value: string | number) => {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\n") || raw.includes("\"")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session || !isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/reports/balances.csv",
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
  const period = searchParams.get("period") ?? "";
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(1000, Math.max(1, Number(searchParams.get("limit") ?? "500") || 500));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);

  let rows: Array<{ plotLabel: string; debt: number; credit: number; balance: number }> = [];

  if (hasPgConnection()) {
    const data = await listBalancesPg({ period: period || null, q: q || null, limit, offset });
    rows = data.items.map((row: { plotLabel: string; debt: number; credit: number; balance: number }) => ({
      plotLabel: row.plotLabel,
      debt: row.debt,
      credit: row.credit,
      balance: row.balance,
    }));
  } else {
    const all = listPlotBalances().filter((row) =>
      q ? row.plotLabel.toLowerCase().includes(q.toLowerCase()) : true,
    );
    rows = all.slice(offset, offset + limit);
  }
  const header = ["plot", "debt", "credit", "balance"].join(",");
  const body = rows
    .map((row: { plotLabel: string; debt: number; credit: number; balance: number }) =>
      [
        escapeCsv(row.plotLabel),
        escapeCsv(row.debt),
        escapeCsv(row.credit),
        escapeCsv(row.balance),
      ].join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=balances.csv",
    },
  });
}
