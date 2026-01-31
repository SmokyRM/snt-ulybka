import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listAccrualsWithStatus, getPlotLabel } from "@/lib/billing.store";

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

    const items = listAccrualsWithStatus()
      .filter((row) => (plot ? row.plotId === plot : true))
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

    return ok(request, { items });
  } catch (error) {
    return serverError(request, "Ошибка загрузки начислений", error);
  }
}
