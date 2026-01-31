import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updatePayment } from "@/lib/billing.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.reconcile", {
    route: "/api/office/billing/reconcile/manual",
    deniedReason: "billing.reconcile",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
    const plotId = typeof body.plotId === "string" ? body.plotId : null;
    if (!paymentId || !plotId) {
      return fail(request, "validation_error", "paymentId и plotId обязательны", 400);
    }

    const updated = updatePayment(paymentId, {
      matchedPlotId: plotId,
      status: "matched",
      matchReason: "manual",
      matchConfidence: 1,
    });

    if (!updated) {
      return fail(request, "not_found", "Платёж не найден", 404);
    }

    return ok(request, { payment: updated });
  } catch (error) {
    return serverError(request, "Ошибка ручного сопоставления", error);
  }
}
