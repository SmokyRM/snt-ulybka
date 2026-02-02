export const runtime = "nodejs";

import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listAccrualsWithStatus, getPlotLabel } from "@/lib/billing.store";
import { hasPgConnection, listAccruals as listAccrualsPg } from "@/lib/billing/accruals.pg";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/accruals",
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
      path: "/api/office/billing/accruals",
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
    const plot = searchParams.get("plot");
    const period = searchParams.get("period");
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? "10") || 10));

    if (hasPgConnection()) {
      const data = await listAccrualsPg({ period, category, q, page, pageSize: limit });
      return ok(request, { items: data.items, total: data.total, page: data.page, limit: data.pageSize });
    }

    const items = listAccrualsWithStatus()
      .filter((row) => (plot ? row.plotId === plot : true))
      .filter((row) => (period ? row.period === period : true))
      .filter((row) => (category ? row.category === category : true))
      .map((row) => ({
        id: row.id,
        date: row.date,
        plotId: row.plotId,
        plot: getPlotLabel(row.plotId),
        title: row.title,
        amount: row.amount,
        paidAmount: row.paidAmount,
        remaining: row.remaining,
        status: row.status,
      }));

    const total = items.length;
    const start = (page - 1) * limit;
    const pageItems = items.slice(start, start + limit);
    return ok(request, { items: pageItems, total, page, limit });
  } catch (error) {
    return serverError(request, "Ошибка загрузки начислений", error);
  }
}
