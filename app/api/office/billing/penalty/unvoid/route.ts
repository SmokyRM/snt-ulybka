export const runtime = "nodejs";

/**
 * Penalty Unvoid API
 * Sprint 23: Restore a voided penalty accrual
 */
import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  hasPgConnection,
  unvoidPenalty as unvoidPenaltyPg,
  listPenaltyAccruals as listPenaltyAccrualsPg,
} from "@/lib/billing/penalty.pg";
import {
  getPenaltyAccrual,
  unvoidPenaltyAccrual,
} from "@/lib/penaltyAccruals.store";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";
import type { PenaltyAccrual } from "@/lib/penaltyAccruals.store";
import { assertPeriodOpenOrReason } from "@/lib/office/periodClose.store";

export async function POST(request: Request) {
  const guard = await requirePermission(request, "billing.penalty.void", {
    route: "/api/office/billing/penalty/unvoid",
    deniedReason: "billing.penalty.void",
  });
  if (guard instanceof Response) return guard;
  const { session, role } = guard;
  if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id : null;
    const reason = typeof body.reason === "string" ? body.reason.trim() : null;

    if (!id) {
      return fail(request, "id_required", "id is required", 400);
    }

    // Get existing penalty for validation and audit
    let existing;
    if (hasPgConnection()) {
      const accruals = await listPenaltyAccrualsPg({ plotId: null, period: null, status: null });
      existing = accruals.find((a: PenaltyAccrual) => a.id === id);
    } else {
      existing = getPenaltyAccrual(id);
    }

    if (!existing) {
      return fail(request, "not_found", "Penalty accrual not found", 404);
    }

    const requestId = generateRequestId();

    // Check period-close rules
    let closeCheck: { closed: false } | { closed: true; reason: string };
    try {
      closeCheck = assertPeriodOpenOrReason(existing.period, reason);
    } catch (e) {
      return fail(request, "period_closed", e instanceof Error ? e.message : "Период закрыт", 409);
    }

    try {
      let updated;
      if (hasPgConnection()) {
        updated = await unvoidPenaltyPg(id, session.id);
        if (!updated) {
          return fail(request, "not_found", "Penalty accrual not found or not voided", 404);
        }
      } else {
        updated = unvoidPenaltyAccrual(id, session.id);
      }

      // Log audit event
      logAuditEvent({
        action: "penalty.unvoid",
        actorId: session.id,
        actorRole: role,
        requestId,
        targetType: "penalty_accrual",
        targetId: id,
        details: {
          plotId: existing.plotId,
          period: existing.period,
          amount: existing.amount,
          postCloseChange: closeCheck.closed,
          reason: closeCheck.closed ? closeCheck.reason : null,
        },
      });

      return ok(request, { accrual: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unvoid penalty";
      return fail(request, "unvoid_failed", message, 400);
    }
  } catch (error) {
    return serverError(request, "Ошибка восстановления пени", error);
  }
}
