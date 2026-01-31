import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  removeAllocation,
  removeAllocationsByPayment,
  listAllocationsByPayment,
  getAllocationById,
  getChargeById,
} from "@/lib/billing.store";
import { assertPeriodsOpenOrReason } from "@/lib/office/periodClose.store";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.allocate", {
    route: "/api/office/billing/allocate/unapply",
    deniedReason: "billing.allocate",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const allocationId = typeof body.allocationId === "string" ? body.allocationId : null;
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
    const reason = typeof body.reason === "string" ? body.reason : null;
    if (!allocationId && !paymentId) {
      return fail(request, "validation_error", "allocationId или paymentId обязателен", 400);
    }
    if (paymentId) {
      const allocations = listAllocationsByPayment(paymentId);
      const periods = allocations
        .map((a) => getChargeById(a.accrualId))
        .filter(Boolean)
        .map((accrual) => (accrual!.period ?? accrual!.date.slice(0, 7)));
      let closeCheck;
      try {
        closeCheck = assertPeriodsOpenOrReason(periods, reason);
      } catch (e) {
        return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
      }
      const removedCount = removeAllocationsByPayment(paymentId);
      if (removedCount === 0) {
        return fail(request, "not_found", "Распределения не найдены", 404);
      }
      await logAdminAction({
        action: "allocation.unapply",
        entity: "billing.allocation",
        entityId: paymentId,
        route: "/api/office/billing/allocate/unapply",
        success: true,
        meta: closeCheck.closed ? { postCloseChange: true, reason: closeCheck.reason, periods: closeCheck.periods } : { periods },
        headers: request.headers,
      });
      return ok(request, { removed: true, removedCount });
    }
    const allocation = getAllocationById(allocationId as string);
    if (!allocation) {
      return fail(request, "not_found", "Распределение не найдено", 404);
    }
    const accrual = getChargeById(allocation.accrualId);
    const period = accrual ? (accrual.period ?? accrual.date.slice(0, 7)) : null;
    let closeCheck;
    try {
      closeCheck = period ? assertPeriodsOpenOrReason([period], reason) : { closed: false, periods: [] };
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }
    const removed = removeAllocation(allocationId as string);
    if (!removed) {
      return fail(request, "not_found", "Распределение не найдено", 404);
    }
    await logAdminAction({
      action: "allocation.unapply",
      entity: "billing.allocation",
      entityId: allocationId as string,
      route: "/api/office/billing/allocate/unapply",
      success: true,
      meta: closeCheck.closed
        ? { postCloseChange: true, reason: closeCheck.reason, periods: [period] }
        : { periods: [period] },
      headers: request.headers,
    });
    return ok(request, { removed: true });
  } catch (error) {
    return serverError(request, "Ошибка снятия распределения", error);
  }
}
