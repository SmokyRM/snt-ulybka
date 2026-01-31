import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updatePayment } from "@/lib/billing.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.allocate", {
    route: "/api/office/billing/payments/auto-allocate",
    deniedReason: "billing.allocate",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
    const disabled = typeof body.disabled === "boolean" ? body.disabled : null;
    if (!paymentId || disabled === null) {
      return fail(request, "validation_error", "paymentId и disabled обязательны", 400);
    }
    const updated = updatePayment(paymentId, { autoAllocateDisabled: disabled });
    if (!updated) {
      return fail(request, "not_found", "Платёж не найден", 404);
    }
    return ok(request, { payment: updated });
  } catch (error) {
    return serverError(request, "Ошибка обновления авто-распределения", error);
  }
}
