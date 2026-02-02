export const runtime = "nodejs";

/**
 * Penalty Freeze API
 * Sprint 23: Freeze a penalty accrual (prevents recalc)
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  hasPgConnection,
  freezePenalty as freezePenaltyPg,
  listPenaltyAccruals as listPenaltyAccrualsPg,
} from "@/lib/billing/penalty.pg";
import {
  getPenaltyAccrual,
  freezePenaltyAccrual,
} from "@/lib/penaltyAccruals.store";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";
import type { PenaltyAccrual } from "@/lib/penaltyAccruals.store";

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

    // Get existing penalty for validation and audit
    let existing;
    if (hasPgConnection()) {
      const accruals = await listPenaltyAccrualsPg({ plotId: null, period: null, status: null });
      existing = accruals.find((a: PenaltyAccrual) => a.id === penaltyAccrualId);
    } else {
      existing = getPenaltyAccrual(penaltyAccrualId);
    }

    if (!existing) {
      return fail(request, "not_found", "Penalty accrual not found", 404);
    }

    const requestId = generateRequestId();

    try {
      let updated;
      if (hasPgConnection()) {
        updated = await freezePenaltyPg(penaltyAccrualId, session.id, reason);
        if (!updated) {
          return fail(request, "not_found", "Penalty accrual not found or already voided", 404);
        }
      } else {
        updated = freezePenaltyAccrual(penaltyAccrualId, session.id, reason);
      }

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
