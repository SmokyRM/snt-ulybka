import { requirePermission } from "@/lib/permissionsGuard";
import {
  findPaymentImportById,
  listPaymentImportRows,
  updatePaymentImport,
  updatePaymentImportRow,
  addPayment,
  listUnifiedBillingPeriods,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import crypto from "crypto";
import { ok, badRequest, fail, serverError } from "@/lib/api/respond";
import { findPeriodForDate } from "@/lib/billing/unifiedReconciliation.server";

function rowHash(row: { date: string; amount: number; plotId: string | null; rowIndex: number }): string {
  return crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex").slice(0, 16);
}

/** Apply: создаёт платежи только по строкам с найденным участком (matchedPlotId) и без ошибок валидации. Запись в журнал — через updatePaymentImport. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requirePermission(request, "billing.import", {
      route: "/api/admin/billing/payments/import/[id]/apply",
      deniedReason: "billing.import",
    });
    if (guard instanceof Response) return guard;
    const { session } = guard;
    if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

    const { id } = await params;
    const import_ = findPaymentImportById(id);
    if (!import_) return fail(request, "not_found", "Импорт не найден", 404);
    if (import_.status !== "draft") {
      return badRequest(request, "Импорт уже применён или отменён");
    }

  const rows = listPaymentImportRows(id);
  const periods = listUnifiedBillingPeriods();
  const toApply = rows.filter((r) => r.matchedPlotId && (!r.validationErrors || r.validationErrors.length === 0));
  const needsReview = rows.filter((r) => !r.validationErrors?.length && !r.matchedPlotId).length;
  const errors = rows.filter((r) => r.validationErrors && r.validationErrors.length > 0).length;

  const seen = new Set<string>();
  let applied = 0;

  for (const row of toApply) {
    if (row.paymentId) {
      applied++;
      continue;
    }
    const h = rowHash({ date: row.date, amount: row.amount, plotId: row.matchedPlotId ?? null, rowIndex: row.rowIndex });
    if (seen.has(h)) continue;
    seen.add(h);

    const matchedPeriod = row.date ? findPeriodForDate(row.date, periods) : null;
    if (matchedPeriod?.status === "closed") {
      continue;
    }

    try {
      const payment = addPayment({
        periodId: matchedPeriod?.id ?? null,
        plotId: row.matchedPlotId!,
        amount: row.amount,
        paidAt: row.date ? `${row.date}T12:00:00.000Z` : new Date().toISOString(),
        method: "import",
        reference: null,
        comment: row.purpose ?? null,
        createdByUserId: session.id ?? null,
        importBatchId: id,
      });
      updatePaymentImportRow(row.id, { paymentId: payment.id });
      applied++;
    } catch {
      // skip row without breaking
    }
  }

  updatePaymentImport(id, {
    status: "applied",
    appliedRows: applied,
    appliedAt: new Date().toISOString(),
    appliedByUserId: session.id ?? null,
  });

    await logAdminAction({
      action: "apply_payment_import",
      entity: "payment_import",
      entityId: id,
      after: { applied, needs_review: needsReview, errors },
      meta: { actorUserId: session.id ?? null, actorRole: session.role ?? null },
      headers: request.headers,
    });

    return ok(request, {
      success: true,
      imported: applied,
      needs_review: needsReview,
      errors,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
