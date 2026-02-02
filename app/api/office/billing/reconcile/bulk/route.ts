export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { updatePayment, type PaymentStatus } from "@/lib/billing.store";
import { hasPgConnection, bulkUpdateMatch } from "@/lib/billing/reconcile.pg";

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
  const guard = await requirePermission(request, "billing.reconcile", {
    route: "/api/office/billing/reconcile/bulk",
    deniedReason: "billing.reconcile",
  });
  if (guard instanceof Response) return guard;

  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? (body.ids.filter((id: unknown): id is string => typeof id === "string")) : [];
    const action = typeof body.action === "string" ? body.action : null;

    if (!action || ids.length === 0) {
      return fail(request, "validation_error", "ids и action обязательны", 400);
    }

    const updates = applyAction(action);
    if (!updates) {
      return fail(request, "validation_error", "Неизвестное действие", 400);
    }

    if (hasPgConnection()) {
      const result = await bulkUpdateMatch({ ids, action: action as "confirm" | "review" | "unmatch" });
      return ok(request, result);
    }

    let updatedCount = 0;
    ids.forEach((id: string) => {
      const updated = updatePayment(id, updates);
      if (updated) updatedCount += 1;
    });

    return ok(request, { updatedCount });
  } catch (error) {
    return serverError(request, "Ошибка массового обновления", error);
  }
}
