/**
 * Office Billing Confirmations API
 * Sprint 21: Staff review of resident payment confirmations
 */
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import {
  listPaymentConfirmations,
  getPaymentConfirmationsSummary,
} from "@/lib/paymentConfirmations.store";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/confirmations",
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
      path: "/api/office/billing/confirmations",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "submitted" | "in_review" | "approved" | "rejected" | null;
    const plotId = searchParams.get("plotId");
    const q = searchParams.get("q");

    const confirmations = listPaymentConfirmations({
      status: status || undefined,
      plotId: plotId || undefined,
      q: q || undefined,
    });

    const summary = getPaymentConfirmationsSummary();

    return ok(request, { confirmations, summary });
  } catch (error) {
    return serverError(request, "Ошибка получения подтверждений", error);
  }
}
