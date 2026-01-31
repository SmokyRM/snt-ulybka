/**
 * Office Billing Confirmation Reject API
 * Sprint 21: Reject confirmation with reason
 */
import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent, logStructured } from "@/lib/structuredLogger/node";
import {
  getPaymentConfirmation,
  rejectConfirmation,
} from "@/lib/paymentConfirmations.store";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const { id } = await params;
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/billing/confirmations/${id}/reject`,
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
      path: `/api/office/billing/confirmations/${id}/reject`,
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const confirmation = getPaymentConfirmation(id);

    if (!confirmation) {
      return fail(request, "not_found", "Подтверждение не найдено", 404);
    }

    if (confirmation.status === "approved") {
      return fail(request, "already_approved", "Подтверждение уже одобрено", 400);
    }

    if (confirmation.status === "rejected") {
      return fail(request, "already_rejected", "Подтверждение уже отклонено", 400);
    }

    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!reason) {
      return fail(request, "reason_required", "Укажите причину отклонения", 400);
    }

    const updated = rejectConfirmation(id, session.id, reason);

    if (!updated) {
      return fail(request, "update_failed", "Не удалось обновить подтверждение", 500);
    }

    logStructured("info", {
      action: "confirmation_rejected",
      confirmationId: id,
      reviewedBy: session.id,
      reason,
    });

    return ok(request, { confirmation: updated });
  } catch (error) {
    return serverError(request, "Ошибка отклонения подтверждения", error);
  }
}
