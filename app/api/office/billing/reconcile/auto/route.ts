export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { runAutoMatch } from "../helpers";
import { hasPgConnection, runAutoMatch as runAutoMatchPg, ReconcileRequestConflictError } from "@/lib/billing/reconcile.pg";
import { withReconcileIdempotency, ReconcileRequestConflictError as ReconcileRequestConflictErrorLocal } from "@/lib/billing/reconcile.idempotency";
import { logAdminAction } from "@/lib/audit";
import { randomUUID } from "crypto";
import { measure } from "@/lib/perf/measure";

export async function POST(request: Request) {
  return measure(
    "billing.reconcile.auto",
    async () => {
      const guard = await requirePermission(request, "billing.reconcile", {
        route: "/api/office/billing/reconcile/auto",
        deniedReason: "billing.reconcile",
      });
      if (guard instanceof Response) return guard;

      try {
        const body = await request.json().catch(() => ({}));
        const limit = typeof body.limit === "number" ? body.limit : undefined;
        const requestId =
          (typeof body.requestId === "string" && body.requestId) || request.headers.get("x-request-id") || randomUUID();

        if (hasPgConnection()) {
          const { result, reused } = await runAutoMatchPg(limit, requestId);
          await logAdminAction({
            action: "billing.reconcile.auto",
            entity: "billing_payment",
            route: "/api/office/billing/reconcile/auto",
            requestId,
            headers: request.headers,
            meta: { limit: limit ?? null, reused },
          });
          return ok(request, { ...result, requestId, reused });
        }

        const { result, reused } = await withReconcileIdempotency(requestId, "auto", async () => runAutoMatch(limit, requestId));
        await logAdminAction({
          action: "billing.reconcile.auto",
          entity: "billing_payment",
          route: "/api/office/billing/reconcile/auto",
          requestId,
          headers: request.headers,
          meta: { limit: limit ?? null, reused },
        });
        return ok(request, { ...result, requestId, reused });
      } catch (error) {
        if (error instanceof ReconcileRequestConflictError || error instanceof ReconcileRequestConflictErrorLocal) {
          return fail(request, "request_id_conflict", "request_id уже использован", 409);
        }
        if (typeof error === "object" && error && "code" in error && error.code === "request_id_conflict") {
          return fail(request, "request_id_conflict", "request_id уже использован", 409);
        }
        return serverError(request, "Ошибка автосопоставления", error);
      }
    },
    { route: "/api/office/billing/reconcile/auto", method: "POST" },
  );
}
