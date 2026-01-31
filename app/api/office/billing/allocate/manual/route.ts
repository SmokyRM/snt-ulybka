import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { createAllocation, getAccrualPaymentSummary, getPaymentAllocationSummary, getChargeById } from "@/lib/billing.store";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.allocate", {
    route: "/api/office/billing/allocate/manual",
    deniedReason: "billing.allocate",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
    const accrualId = typeof body.accrualId === "string" ? body.accrualId : null;
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const reason = typeof body.reason === "string" ? body.reason : null;

    if (!paymentId || !accrualId || !Number.isFinite(amount)) {
      return fail(request, "validation_error", "paymentId, accrualId, amount обязательны", 400);
    }

    const paymentSummary = getPaymentAllocationSummary(paymentId);
    const accrualSummary = getAccrualPaymentSummary(accrualId);
    if (!paymentSummary || !accrualSummary) {
      return fail(request, "not_found", "Платёж или начисление не найдено", 404);
    }

    const accrual = getChargeById(accrualId);
    if (!accrual) {
      return fail(request, "not_found", "Начисление не найдено", 404);
    }
    const period = (accrual.period ?? accrual.date.slice(0, 7));
    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    if (amount <= 0 || amount > paymentSummary.remainingAmount || amount > accrualSummary.remainingAmount) {
      return fail(request, "validation_error", "Сумма превышает остаток", 400);
    }

    const allocation = createAllocation({ paymentId, accrualId, amount });
    await logAdminAction({
      action: "allocation.manual",
      entity: "billing.allocation",
      entityId: allocation.id,
      route: "/api/office/billing/allocate/manual",
      success: true,
      meta: closeCheck.closed ? { period, postCloseChange: true, reason: closeCheck.reason } : { period },
      headers: request.headers,
    });
    return ok(request, { allocation });
  } catch (error) {
    return serverError(request, "Ошибка ручного распределения", error);
  }
}
