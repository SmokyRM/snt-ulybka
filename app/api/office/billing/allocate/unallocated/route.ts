export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getUnallocatedPayments, hasPgConnection } from "@/lib/billing/allocations.pg";
import { listPaymentsWithStatus, type PaymentMatchStatus } from "@/lib/billing.store";
import { getPlotLabel } from "@/lib/billing.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/allocate/unallocated",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/allocate/unallocated",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period");
    const q = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? "10") || 10));

    if (hasPgConnection()) {
      const data = await getUnallocatedPayments({ period, q, page, pageSize: limit });
      return ok(request, { items: data.items, total: data.total, page: data.page, limit: data.pageSize });
    }

    const all = listPaymentsWithStatus({ matchStatus: "unmatched" as PaymentMatchStatus })
      .filter((row) => (period ? row.date.startsWith(period) : true))
      .filter((row) => (q ? `${row.payer ?? ""} ${row.plotId}`.toLowerCase().includes(q.toLowerCase()) : true))
      .filter((row) => (row.allocationStatus ?? "unallocated") === "unallocated");
    const total = all.length;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit).map((row) => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      payer: row.payer ?? "—",
      plot: row.plotId ? getPlotLabel(row.plotId) : "—",
      allocatedAmount: row.allocatedAmount ?? 0,
      remainingAmount: row.remainingAmount ?? row.amount,
      allocationStatus: row.allocationStatus ?? "unallocated",
    }));

    return ok(request, { items, total, page, limit });
  } catch (error) {
    return serverError(request, "Ошибка загрузки платежей", error);
  }
}
