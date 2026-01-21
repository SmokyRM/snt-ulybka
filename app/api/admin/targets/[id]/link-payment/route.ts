import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { findTargetFundById, findPaymentById, updatePayment } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

type ParamsPromise<T> = { params: Promise<T> };

export async function POST(request: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);

  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const { id: targetFundId } = await params;
    const body = await request.json().catch(() => ({}));
    const paymentId = body.paymentId as string | undefined;

    if (!paymentId) {
      return badRequest(request, "ID платежа обязателен");
    }

    const fund = findTargetFundById(targetFundId);
    if (!fund) {
      return fail(request, "not_found", "Цель не найдена", 404);
    }

    const payment = findPaymentById(paymentId);
    if (!payment) {
      return fail(request, "not_found", "Платеж не найден", 404);
    }

    if (payment.isVoided) {
      return badRequest(request, "Нельзя привязать аннулированный платеж");
    }

    const before = { ...payment };
    const updated = updatePayment(paymentId, { targetFundId });

    if (!updated) {
      return serverError(request, "Ошибка обновления платежа");
    }

    await logAdminAction({
      action: "link_payment_to_target",
      entity: "payment",
      entityId: paymentId,
      before: { payment: before },
      after: { payment: updated, targetFundId },
      headers: request.headers,
    });

    return ok(request, { payment: updated });
  } catch (error) {
    console.error("Error linking payment to target:", error);
    return serverError(request, "Ошибка привязки платежа", error);
  }
}
