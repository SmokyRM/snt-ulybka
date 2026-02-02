export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { autoAllocatePayments, listPaymentsFiltered, getPaymentById } from "@/lib/billing.store";
import { hasPgConnection, applyAutoAllocations, getPeriodsForAutoAllocate } from "@/lib/billing/allocations.pg";
import { assertPeriodsOpenOrReason } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.allocate", {
    route: "/api/office/billing/allocate/auto",
    deniedReason: "billing.allocate",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : undefined;
    let from = typeof body.from === "string" ? body.from : undefined;
    let to = typeof body.to === "string" ? body.to : undefined;
    const paymentIds = Array.isArray(body.paymentIds)
      ? (body.paymentIds as unknown[]).filter((id): id is string => typeof id === "string")
      : undefined;

    const period = typeof body.period === "string" ? body.period : null;
    const reason = typeof body.reason === "string" ? body.reason : null;
    if (period && !from && !to) {
      const [year, month] = period.split("-");
      if (year && month) {
        const start = `${year}-${month}-01`;
        const startDate = new Date(`${start}T00:00:00Z`);
        const endDate = new Date(startDate);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);
        endDate.setUTCDate(0);
        from = start;
        to = endDate.toISOString().slice(0, 10);
      }
    }

    const paymentsScope = paymentIds?.length
      ? paymentIds
          .map((id) => getPaymentById(id))
          .filter((payment): payment is NonNullable<ReturnType<typeof getPaymentById>> => Boolean(payment))
      : listPaymentsFiltered({ from, to });
    const periods = Array.from(new Set(paymentsScope.map((p) => p.date.slice(0, 7))));

    let closeCheck: { closed: false; periods: string[] } | { closed: true; periods: string[]; reason: string };
    try {
      const targetPeriods = hasPgConnection()
        ? await getPeriodsForAutoAllocate({ period, paymentIds })
        : periods;
      closeCheck = assertPeriodsOpenOrReason(targetPeriods, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    const result = hasPgConnection()
      ? await applyAutoAllocations({ period, paymentIds })
      : autoAllocatePayments({ limit, from, to, paymentIds });
    await logAdminAction({
      action: "allocation.auto",
      entity: "billing.allocation",
      entityId: null,
      route: "/api/office/billing/allocate/auto",
      success: true,
      meta: closeCheck.closed ? { postCloseChange: true, reason: closeCheck.reason, periods: closeCheck.periods } : { periods: closeCheck.periods },
      headers: request.headers,
    });
    return ok(request, result);
  } catch (error) {
    return serverError(request, "Ошибка автораспределения", error);
  }
}
