/**
 * Penalty Freeze API
 * Sprint 23: Freeze a penalty accrual (prevents recalc)
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  getPenaltyAccrual,
  freezePenaltyAccrual,
} from "@/lib/penaltyAccruals.store";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.freeze", {
    route: "/api/office/billing/penalty/freeze",
    deniedReason: "billing.penalty.freeze",
  });
  if (guard instanceof Response) return guard;
  const { session, role } = guard;
  if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const penaltyAccrualId = typeof body.penaltyAccrualId === "string" ? body.penaltyAccrualId : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!penaltyAccrualId) {
      return fail(request, "id_required", "penaltyAccrualId is required", 400);
    }

    if (!reason) {
      return fail(request, "reason_required", "reason is required", 400);
    }

    const existing = getPenaltyAccrual(penaltyAccrualId);
    if (!existing) {
      return fail(request, "not_found", "Penalty accrual not found", 404);
    }

    const requestId = generateRequestId();

    try {
      const updated = freezePenaltyAccrual(penaltyAccrualId, session.id, reason);

      // Log audit event
      logAuditEvent({
        action: "penalty.freeze",
        actorId: session.id,
        actorRole: role,
        requestId,
        targetType: "penalty_accrual",
        targetId: penaltyAccrualId,
        details: {
          plotId: existing.plotId,
          period: existing.period,
          amount: existing.amount,
          reason,
        },
      });

      return ok(request, { accrual: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to freeze penalty";
      return fail(request, "freeze_failed", message, 400);
    }
  } catch (error) {
    return serverError(request, "Ошибка заморозки пени", error);
  }
}
