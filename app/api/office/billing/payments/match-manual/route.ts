import { ok, badRequest, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updatePayment, resolvePlotIdByLabel, listCharges } from "@/lib/billing.store";
import { logAdminAction } from "@/lib/audit";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.match_payments_manual", {
    route: "/api/office/billing/payments/match-manual",
    deniedReason: "billing.match_payments_manual",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
    const plotInput = typeof body.plotId === "string" ? body.plotId.trim() : "";

    if (!paymentId || !plotInput) {
      return badRequest(request, "Нужно указать платёж и участок");
    }

    const resolvedPlotId = resolvePlotIdByLabel(plotInput) ?? plotInput;
    const charge = listCharges().find((c) => c.plotId === resolvedPlotId);

    const updated = updatePayment(paymentId, {
      plotId: resolvedPlotId,
      residentId: charge?.residentId ?? "unknown",
      matchedPlotId: resolvedPlotId,
      matchStatus: "matched",
      matchCandidates: [resolvedPlotId],
      matchReason: "manual",
      matchConfidence: 1,
      status: "matched",
    });

    if (!updated) {
      return badRequest(request, "Платёж не найден");
    }

    await logAdminAction({
      action: "payment.match.manual",
      entity: "payment",
      entityId: paymentId,
      route: "/api/office/billing/payments/match-manual",
      success: true,
      meta: { plotId: resolvedPlotId },
      headers: request.headers,
    });

    return ok(request, { payment: updated });
  } catch (error) {
    return serverError(request, "Ошибка ручного сопоставления", error);
  }
}
