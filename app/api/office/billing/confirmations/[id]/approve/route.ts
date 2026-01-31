/**
 * Office Billing Confirmation Approve API
 * Sprint 21: Approve confirmation (link or create payment)
 */
import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent, logStructured } from "@/lib/structuredLogger/node";
import {
  getPaymentConfirmation,
  approveConfirmationWithLink,
  approveConfirmationWithCreate,
} from "@/lib/paymentConfirmations.store";
import { createId } from "@/lib/mockDb";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const { id } = await params;
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/billing/confirmations/${id}/approve`,
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
      path: `/api/office/billing/confirmations/${id}/approve`,
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
    const linkedPaymentId = typeof body.linkedPaymentId === "string" ? body.linkedPaymentId : null;
    const createPayment = body.createPayment === true;

    let resultPaymentId: string;
    let updated;

    if (linkedPaymentId) {
      // Link to existing payment
      updated = approveConfirmationWithLink(id, session.id, linkedPaymentId);
      resultPaymentId = linkedPaymentId;

      logStructured("info", {
        action: "confirmation_approved_linked",
        confirmationId: id,
        linkedPaymentId,
        reviewedBy: session.id,
      });
    } else if (createPayment) {
      // Create new payment
      // In a real implementation, this would create a payment record
      const newPaymentId = createId("pay");
      updated = approveConfirmationWithCreate(id, session.id, newPaymentId);
      resultPaymentId = newPaymentId;

      logStructured("info", {
        action: "confirmation_approved_created",
        confirmationId: id,
        newPaymentId,
        reviewedBy: session.id,
        amount: confirmation.amount,
        plotId: confirmation.plotId,
        paidAt: confirmation.paidAt,
      });
    } else {
      // Just approve without linking
      const noLinkId = `manual-${id}`;
      updated = approveConfirmationWithLink(id, session.id, noLinkId);
      resultPaymentId = noLinkId;

      logStructured("info", {
        action: "confirmation_approved_manual",
        confirmationId: id,
        reviewedBy: session.id,
      });
    }

    if (!updated) {
      return fail(request, "update_failed", "Не удалось обновить подтверждение", 500);
    }

    return ok(request, {
      confirmation: updated,
      linkedPaymentId: resultPaymentId,
    });
  } catch (error) {
    return serverError(request, "Ошибка одобрения подтверждения", error);
  }
}
