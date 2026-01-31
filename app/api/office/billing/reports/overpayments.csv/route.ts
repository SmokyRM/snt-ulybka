import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listPaymentsWithStatus, getPlotLabel } from "@/lib/billing.store";

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
      path: "/api/office/billing/reports/overpayments.csv",
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

  const rows = listPaymentsWithStatus().filter((p) => (p.allocationStatus ?? "unallocated") === "overpaid");
  const header = ["date", "amount", "payer", "plot", "remaining"].join(",");
  const body = rows
    .map((row) =>
      [
        escapeCsv(row.date),
        escapeCsv(row.amount),
        escapeCsv(row.payer ?? ""),
        escapeCsv(getPlotLabel(row.plotId)),
        escapeCsv(row.remaining ?? 0),
      ].join(","),
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=overpayments.csv",
    },
  });
}
