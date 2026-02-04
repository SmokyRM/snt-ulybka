export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updatePayment, type PaymentStatus } from "@/lib/billing.store";
import { hasPgConnection, bulkUpdateMatch, ReconcileRequestConflictError } from "@/lib/billing/reconcile.pg";
import { withReconcileIdempotency, ReconcileRequestConflictError as ReconcileRequestConflictErrorLocal } from "@/lib/billing/reconcile.idempotency";
import { logAdminAction } from "@/lib/audit";
import { randomUUID } from "crypto";
import { measure } from "@/lib/perf/measure";

const applyAction = (action: string): Partial<{ status: PaymentStatus; matchReason: string; matchConfidence: number | null; matchedPlotId: string | null }> | null => {
  if (action === "confirm") {
    return { status: "matched", matchReason: "confirmed", matchConfidence: 1 };
  }
  if (action === "review") {
    return { status: "needs_review", matchReason: "needs_review", matchConfidence: 0.3 };
  }
  if (action === "unmatch") {
    return { status: "unmatched", matchReason: "unmatched", matchedPlotId: null, matchConfidence: null };
  }
  return null;
};

export async function POST(request: Request) {
  return measure(
    "billing.reconcile.bulk",
    async () => {
      const guard = await requirePermission(request, "billing.reconcile", {
        route: "/api/office/billing/reconcile/bulk",
        deniedReason: "billing.reconcile",
      });
      if (guard instanceof Response) return guard;

      try {
        const body = await request.json().catch(() => ({}));
        const ids = Array.isArray(body.ids) ? (body.ids.filter((id: unknown): id is string => typeof id === "string")) : [];
        const action = typeof body.action === "string" ? body.action : null;
        const requestId =
          (typeof body.requestId === "string" && body.requestId) || request.headers.get("x-request-id") || randomUUID();

        if (!action || ids.length === 0) {
          return fail(request, "validation_error", "ids и action обязательны", 400);
        }

        const updates = applyAction(action);
        if (!updates) {
          return fail(request, "validation_error", "Неизвестное действие", 400);
        }

        if (hasPgConnection()) {
          const { result, reused } = await bulkUpdateMatch({
            ids,
            action: action as "confirm" | "review" | "unmatch",
            requestId,
          });
          await logAdminAction({
            action: "billing.reconcile.bulk",
            entity: "billing_payment",
            route: "/api/office/billing/reconcile/bulk",
            requestId,
            headers: request.headers,
            meta: { action, idsCount: ids.length, reused },
          });
          return ok(request, { ...result, requestId, reused });
        }

        const { result, reused } = await withReconcileIdempotency(requestId, "bulk", async () => {
          let updatedCount = 0;
          ids.forEach((id: string) => {
            const updated = updatePayment(id, { ...updates, reconcileRequestId: requestId });
            if (updated) updatedCount += 1;
          });
          return { updatedCount };
        });

        await logAdminAction({
          action: "billing.reconcile.bulk",
          entity: "billing_payment",
          route: "/api/office/billing/reconcile/bulk",
          requestId,
          headers: request.headers,
          meta: { action, idsCount: ids.length, reused },
        });

        return ok(request, { ...result, requestId, reused });
      } catch (error) {
        if (error instanceof ReconcileRequestConflictError || error instanceof ReconcileRequestConflictErrorLocal) {
          return fail(request, "request_id_conflict", "request_id уже использован", 409);
        }
        if (typeof error === "object" && error && "code" in error && error.code === "request_id_conflict") {
          return fail(request, "request_id_conflict", "request_id уже использован", 409);
        }
        return serverError(request, "Ошибка массового обновления", error);
      }
    },
    { route: "/api/office/billing/reconcile/bulk", method: "POST" },
  );
}
