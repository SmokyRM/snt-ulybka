import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { applyCreditFromPayments } from "@/lib/billing.store";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/billing/credits/apply",
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
      path: "/api/office/billing/credits/apply",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const paymentIds = Array.isArray(body.paymentIds)
      ? body.paymentIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    if (paymentIds.length === 0) {
      return fail(request, "validation_error", "paymentIds обязателен", 400);
    }
    const result = applyCreditFromPayments(paymentIds);
    return ok(request, result);
  } catch (error) {
    return serverError(request, "Ошибка применения кредита", error);
  }
}
