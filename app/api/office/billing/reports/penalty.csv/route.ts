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
      path: "/api/office/billing/reports/penalty.csv",
      role: session?.role ?? null,
      userId: session?.id ?? null,
      status: session ? 403 : 401,
      latencyMs: Date.now() - startedAt,
      error: session ? "FORBIDDEN" : "UNAUTHORIZED",
    });
    return NextResponse.json({ ok: false, error: { code: session ? "forbidden" : "unauthorized", message: "Forbidden" } }, { status: session ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  const asOf = searchParams.get("asOf") ?? new Date().toISOString().slice(0, 10);
  const rate = Number(searchParams.get("rate") ?? "0.1");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const asOfDate = new Date(asOf);

  let rows = listAccrualsWithStatus().filter((row) => (row.remaining ?? 0) > 0);
  if (from) {
    const fromTs = new Date(from).getTime();
    rows = rows.filter((row) => new Date(row.date).getTime() >= fromTs);
  }
  if (to) {
    const toTs = new Date(to).getTime();
    rows = rows.filter((row) => new Date(row.date).getTime() <= toTs);
  }

  const header = ["plot", "period", "amount", "remaining", "days_overdue", "penalty"].join(",");
  const body = rows
    .map((row) => {
      const daysOverdue = Math.max(0, Math.floor((asOfDate.getTime() - new Date(row.date).getTime()) / 86400000));
      const penalty = Math.round((row.remaining ?? 0) * rate * (daysOverdue / 365));
      return [
        escapeCsv(getPlotLabel(row.plotId)),
        escapeCsv(row.period ?? ""),
        escapeCsv(row.amount),
        escapeCsv(row.remaining ?? 0),
        escapeCsv(daysOverdue),
        escapeCsv(penalty),
      ].join(",");
    })
    .join("\n");

  const csv = `${header}\n${body}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=penalty.csv",
    },
  });
}
