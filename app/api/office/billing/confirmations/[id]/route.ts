/**
 * Office Billing Confirmation Detail API
 * Sprint 21: Get single confirmation details
 */
import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import {
  getPaymentConfirmation,
  markConfirmationInReview,
} from "@/lib/paymentConfirmations.store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const startedAt = Date.now();
  const { id } = await params;
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: `/api/office/billing/confirmations/${id}`,
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
      path: `/api/office/billing/confirmations/${id}`,
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

    // Mark as in_review when staff views it
    if (confirmation.status === "submitted") {
      markConfirmationInReview(id);
      confirmation.status = "in_review";
    }

    return ok(request, { confirmation });
  } catch (error) {
    return serverError(request, "Ошибка получения подтверждения", error);
  }
}
