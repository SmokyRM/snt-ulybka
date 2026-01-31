import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { autoAllocatePayments, listPaymentsFiltered, getPaymentById } from "@/lib/billing.store";
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
    const from = typeof body.from === "string" ? body.from : undefined;
    const to = typeof body.to === "string" ? body.to : undefined;
    const paymentIds = Array.isArray(body.paymentIds)
      ? (body.paymentIds as unknown[]).filter((id): id is string => typeof id === "string")
      : undefined;

    const reason = typeof body.reason === "string" ? body.reason : null;
    const paymentsScope = paymentIds?.length
      ? paymentIds
          .map((id) => getPaymentById(id))
          .filter((payment): payment is NonNullable<ReturnType<typeof getPaymentById>> => Boolean(payment))
      : listPaymentsFiltered({ from, to });
    const periods = Array.from(new Set(paymentsScope.map((p) => p.date.slice(0, 7))));

    let closeCheck: { closed: false; periods: string[] } | { closed: true; periods: string[]; reason: string };
    try {
      closeCheck = assertPeriodsOpenOrReason(periods, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    const result = autoAllocatePayments({ limit, from, to, paymentIds });
    await logAdminAction({
      action: "allocation.auto",
      entity: "billing.allocation",
      entityId: null,
      route: "/api/office/billing/allocate/auto",
      success: true,
      meta: closeCheck.closed ? { postCloseChange: true, reason: closeCheck.reason, periods: closeCheck.periods } : { periods },
      headers: request.headers,
    });
    return ok(request, result);
  } catch (error) {
    return serverError(request, "Ошибка автораспределения", error);
  }
}
