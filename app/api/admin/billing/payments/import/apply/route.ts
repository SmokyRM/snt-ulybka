import { requirePermission } from "@/lib/permissionsGuard";
import {
  createPaymentImport,
  createPaymentImportRow,
  updatePaymentImport,
  updatePaymentImportRow,
  addPayment,
  listPayments,
  listPaymentImportRows,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import crypto from "crypto";
import { ok, badRequest, fail, serverError } from "@/lib/api/respond";

function fingerprint(date: string, amount: number, plotId: string, phone: string, comment: string): string {
  const s = [date, String(amount), plotId || "", (phone || "").trim(), (comment || "").trim()].join("|");
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);
}

type InRow = {
  rowNumber: number;
  rawLine: string;
  date: string;
  amount: number;
  plotNumber?: string | null;
  ownerName?: string | null;
  phone?: string | null;
  comment?: string | null;
  status?: string;
  errorMessage?: string | null;
  matchedPlotId?: string | null;
  matchType?: string | null;
  periodId?: string | null;
};

/** Apply: создаёт PaymentImport, PaymentImportRows, Payments. Дедуп по fingerprint. Admin + office. */
export async function POST(request: Request) {
  try {
    const guard = await requirePermission(request, "billing.import", {
      route: "/api/admin/billing/payments/import/apply",
      deniedReason: "billing.import",
    });
    if (guard instanceof Response) return guard;
    const { session } = guard;
    if (!session) return fail(request, "unauthorized", "Unauthorized", 401);

    const body = await request.json().catch(() => ({}));
    const rows = body.rows as InRow[] | undefined;
    const fileName = typeof body.fileName === "string" ? body.fileName : "import.csv";

    if (!Array.isArray(rows) || rows.length === 0) {
      return badRequest(request, "rows (array) is required");
    }

    const import_ = createPaymentImport({
      fileName,
      totalRows: rows.length,
      createdByUserId: session.id ?? null,
    });

    const existingPayments = listPayments({});
    const existingFps = new Set(existingPayments.map((p) => p.fingerprint).filter(Boolean));
    const seenInBatch = new Set<string>();

    let matchedRows = 0;
    let unmatchedRows = 0;
    let errorRows = 0;
    let appliedRows = 0;

    for (const r of rows) {
      const rowNumber = Number(r.rowNumber) || 0;
      const rawLine = String(r.rawLine ?? "");
      const date = String(r.date ?? "");
      const amount = Number(r.amount) || 0;
      const plotNumber = r.plotNumber ?? null;
      const ownerName = r.ownerName ?? null;
      const phone = r.phone ?? null;
      const comment = r.comment ?? null;
      const status = r.status;
      const errorMessage = r.errorMessage ?? null;
      const matchedPlotId = r.matchedPlotId ?? null;
      const matchType = r.matchType ?? null;
      const periodId = r.periodId ?? null;

      const hasError = status === "error" || !!errorMessage;
      if (hasError) errorRows++;
      else if (!matchedPlotId) unmatchedRows++;
      else matchedRows++;

      const rawData: Record<string, string | number | null> = {
        rawLine,
        date,
        amount,
        plotNumber: plotNumber ?? null,
        ownerName: ownerName ?? null,
        phone: phone ?? null,
        comment: comment ?? null,
      };

      const mt = matchType === "owner_name" ? "fullname" : (matchType as "plot_number" | "phone" | "fullname" | null);
      createPaymentImportRow({
        importId: import_.id,
        rowIndex: rowNumber,
        date: date || "1970-01-01",
        amount,
        purpose: comment,
        fullName: ownerName,
        phone,
        plotNumber,
        matchedPlotId,
        matchType: mt,
        validationErrors: errorMessage ? [errorMessage] : null,
        rawData,
      });
    }

    const list = listPaymentImportRows(import_.id);

    // Create payments for ok/warning with matchedPlotId and no validation error
    for (const r of rows) {
      if (r.status === "error" || r.errorMessage || !r.matchedPlotId) continue;

      const date = String(r.date ?? "");
      const amount = Number(r.amount) || 0;
      const phone = String(r.phone ?? "");
      const comment = String(r.comment ?? "").trim();
      const plotId = r.matchedPlotId;

      const fp = fingerprint(date, amount, plotId, phone, comment);
      if (seenInBatch.has(fp) || existingFps.has(fp)) continue;
      seenInBatch.add(fp);

      try {
        const payment = addPayment({
          periodId: r.periodId || null,
          plotId,
          amount,
          paidAt: date ? `${date}T12:00:00.000Z` : new Date().toISOString(),
          method: "import",
          reference: null,
          comment: comment || null,
          createdByUserId: session.id ?? null,
          importBatchId: import_.id,
          fingerprint: fp,
        });

        const row = list.find((x) => x.rowIndex === r.rowNumber && x.matchedPlotId === plotId && !x.paymentId);
        if (row) updatePaymentImportRow(row.id, { paymentId: payment.id });
        appliedRows++;
        existingFps.add(fp);
      } catch {
        // skip
      }
    }

    updatePaymentImport(import_.id, {
      status: "applied",
      matchedRows,
      unmatchedRows,
      errorRows,
      appliedRows,
      appliedAt: new Date().toISOString(),
      appliedByUserId: session.id ?? null,
    });

    await logAdminAction({
      action: "apply_payment_import",
      entity: "payment_import",
      entityId: import_.id,
      after: { applied: appliedRows, matchedRows, unmatchedRows, errorRows },
      headers: request.headers,
    });

    return ok(request, {
      importId: import_.id,
      applied: appliedRows,
      matched: matchedRows,
      unmatched: unmatchedRows,
      errors: errorRows,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
