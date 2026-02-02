export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { hasPgConnection, listAllocations as listAllocationsPg } from "@/lib/billing/allocations.pg";
import { listAllocations, getChargeById, getPaymentById, getPlotLabel } from "@/lib/billing.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/allocations",
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
      path: "/api/office/billing/allocations",
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
    const paymentId = searchParams.get("paymentId");
    const accrualId = searchParams.get("accrualId");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? "10") || 10));

    if (hasPgConnection()) {
      const data = await listAllocationsPg({ period, paymentId, accrualId, page, pageSize: limit });
      return ok(request, { items: data.items, total: data.total, page: data.page, limit: data.pageSize });
    }

    const all = listAllocations()
      .filter((allocation) => (paymentId ? allocation.paymentId === paymentId : true))
      .filter((allocation) => (accrualId ? allocation.accrualId === accrualId : true))
      .filter((allocation) => {
        if (!period) return true;
        const accrual = getChargeById(allocation.accrualId);
        const accrualPeriod = accrual ? (accrual.period ?? accrual.date.slice(0, 7)) : "";
        return accrualPeriod === period;
      })
      .map((allocation) => {
        const accrual = getChargeById(allocation.accrualId);
        const payment = getPaymentById(allocation.paymentId);
        return {
          id: allocation.id,
          paymentId: allocation.paymentId,
          accrualId: allocation.accrualId,
          amount: allocation.amount,
          period: accrual ? (accrual.period ?? accrual.date.slice(0, 7)) : "",
          paymentDate: payment?.date ?? "",
          plot: payment?.plotId ? getPlotLabel(payment.plotId) : "—",
        };
      });

    const total = all.length;
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);

    return ok(request, { items, total, page, limit });
  } catch (error) {
    return serverError(request, "Ошибка загрузки распределений", error);
  }
}
