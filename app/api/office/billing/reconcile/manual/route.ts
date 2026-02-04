export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updatePayment } from "@/lib/billing.store";
import { hasPgConnection, manualMatch, ReconcileRequestConflictError } from "@/lib/billing/reconcile.pg";
import { withReconcileIdempotency, ReconcileRequestConflictError as ReconcileRequestConflictErrorLocal } from "@/lib/billing/reconcile.idempotency";
import { logAdminAction } from "@/lib/audit";
import { randomUUID } from "crypto";
import { measure } from "@/lib/perf/measure";

export async function POST(request: Request) {
  return measure(
    "billing.reconcile.manual",
    async () => {
      const guard = await requirePermission(request, "billing.reconcile", {
        route: "/api/office/billing/reconcile/manual",
        deniedReason: "billing.reconcile",
      });
      if (guard instanceof Response) return guard;

      try {
        const body = await request.json().catch(() => ({}));
        const paymentId = typeof body.paymentId === "string" ? body.paymentId : null;
        const plotId = typeof body.plotId === "string" ? body.plotId : null;
        const requestId =
          (typeof body.requestId === "string" && body.requestId) || request.headers.get("x-request-id") || randomUUID();
        if (!paymentId || !plotId) {
          return fail(request, "validation_error", "paymentId и plotId обязательны", 400);
        }

        if (hasPgConnection()) {
          const { result, reused } = await manualMatch({ paymentId, plotId, requestId });
          if ("error" in result && result.error === "plot_not_found") {
            return fail(request, "not_found", "Участок не найден", 404);
          }
          if (!result.updated) {
            return fail(request, "not_found", "Платёж не найден", 404);
          }
          await logAdminAction({
            action: "billing.reconcile.manual",
            entity: "billing_payment",
            entityId: paymentId,
            route: "/api/office/billing/reconcile/manual",
            requestId,
            headers: request.headers,
            meta: { plotId, reused },
          });
          return ok(request, { paymentId, requestId, reused });
        }

        const { result, reused } = await withReconcileIdempotency(requestId, "manual", async () => {
          const updated = updatePayment(paymentId, {
            matchedPlotId: plotId,
            status: "matched",
            matchReason: "manual",
            matchConfidence: 1,
            reconcileRequestId: requestId,
          });
          return { updated: Boolean(updated) };
        });

        if (!result.updated) {
          return fail(request, "not_found", "Платёж не найден", 404);
        }

        await logAdminAction({
          action: "billing.reconcile.manual",
          entity: "billing_payment",
          entityId: paymentId,
          route: "/api/office/billing/reconcile/manual",
          requestId,
          headers: request.headers,
          meta: { plotId, reused },
        });

        return ok(request, { paymentId, requestId, reused });
      } catch (error) {
        if (error instanceof ReconcileRequestConflictError || error instanceof ReconcileRequestConflictErrorLocal) {
          return fail(request, "request_id_conflict", "request_id уже использован", 409);
        }
        if (typeof error === "object" && error && "code" in error && error.code === "request_id_conflict") {
          return fail(request, "request_id_conflict", "request_id уже использован", 409);
        }
        return serverError(request, "Ошибка ручного сопоставления", error);
      }
    },
    { route: "/api/office/billing/reconcile/manual", method: "POST" },
  );
}
