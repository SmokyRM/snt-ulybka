export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getPlotLabel } from "@/lib/billing.store";
import {
  hasPgConnection,
  listPenaltyAccruals as listPenaltyAccrualsPg,
} from "@/lib/billing/penalty.pg";
import {
  listPenaltyAccruals,
  type PenaltyAccrualStatus,
  type PenaltyAccrual,
} from "@/lib/penaltyAccruals.store";

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
  const status = searchParams.get("status") as PenaltyAccrualStatus | null;
  const period = searchParams.get("period");
  const plotId = searchParams.get("plotId");

  let penalties: PenaltyAccrual[];
  if (hasPgConnection()) {
    // Use PG layer
    penalties = await listPenaltyAccrualsPg({
      status: status || null,
      period: period || null,
      plotId: plotId || null,
    });
  } else {
    // Fallback to in-memory store
    penalties = listPenaltyAccruals({
      status: status || undefined,
      period: period || undefined,
      plotId: plotId || undefined,
    });
  }

  const header = ["period", "plot_id", "plot_label", "amount", "status", "created_at", "metadata_asOf", "metadata_days_overdue", "metadata_rate_per_day"].join(",");
  const body = penalties
    .map((p: PenaltyAccrual) => [
      escapeCsv(p.period),
      escapeCsv(p.plotId),
      escapeCsv(getPlotLabel(p.plotId)),
      escapeCsv(p.amount),
      escapeCsv(p.status),
      escapeCsv(p.createdAt),
      escapeCsv(p.metadata.asOf),
      escapeCsv(p.metadata.daysOverdue),
      escapeCsv(p.metadata.ratePerDay),
    ].join(","))
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
