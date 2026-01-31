import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listAccrualsWithStatus, getPlotLabel } from "@/lib/billing.store";

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
  const from = searchParams.get("from") ?? null;
  const to = searchParams.get("to") ?? null;

  let rows = listAccrualsWithStatus();
  if (from) {
    const fromTs = new Date(from).getTime();
    rows = rows.filter((row) => new Date(row.date).getTime() >= fromTs);
  }
  if (to) {
    const toTs = new Date(to).getTime();
    rows = rows.filter((row) => new Date(row.date).getTime() <= toTs);
  }

  const header = ["date", "plot", "title", "amount", "paid", "remaining", "status"].join(",");
  const body = rows
    .map((row) =>
      [
        escapeCsv(row.date),
        escapeCsv(getPlotLabel(row.plotId)),
        escapeCsv(row.title),
        escapeCsv(row.amount),
        escapeCsv(row.paidAmount ?? 0),
        escapeCsv(row.remaining ?? 0),
        escapeCsv(row.status ?? "open"),
      ].join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=accruals.csv",
    },
  });
}
