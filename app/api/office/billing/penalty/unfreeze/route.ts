/**
 * Penalty Unfreeze API
 * Sprint 23: Unfreeze a penalty accrual
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  getPenaltyAccrual,
  unfreezePenaltyAccrual,
} from "@/lib/penaltyAccruals.store";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.freeze", {
    route: "/api/office/billing/penalty/unfreeze",
    deniedReason: "billing.penalty.freeze",
  });
  if (guard instanceof Response) return guard;
  const { session, role } = guard;
  if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : null;

    if (!id) {
      return fail(request, "id_required", "id is required", 400);
    }

    const existing = getPenaltyAccrual(id);
    if (!existing) {
      return fail(request, "not_found", "Penalty accrual not found", 404);
    }

    const requestId = generateRequestId();

    try {
      const updated = unfreezePenaltyAccrual(id, session.id);

      // Log audit event
      logAuditEvent({
        action: "penalty.unfreeze",
        actorId: session.id,
        actorRole: role,
        requestId,
        targetType: "penalty_accrual",
        targetId: id,
        details: {
          plotId: existing.plotId,
          period: existing.period,
          amount: existing.amount,
        },
      });

      return ok(request, { accrual: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unfreeze penalty";
      return fail(request, "unfreeze_failed", message, 400);
    }
  } catch (error) {
    return serverError(request, "Ошибка разморозки пени", error);
  }
}
