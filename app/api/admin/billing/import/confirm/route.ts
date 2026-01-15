import { NextResponse } from "next/server";
import { getSessionUser, hasBillingAccess } from "@/lib/session.server";
import {
  addPayment,
  createAccrualPeriod,
  ensureAccrualItem,
  findAccrualPeriod,
  findPlotById,
  listPayments,
  createImportBatch,
  updateImportBatch,
  createBillingImport,
  updateBillingImport,
  addBillingImportError,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { buildPaymentFingerprint, normalizePaymentFingerprint } from "@/lib/paymentFingerprint";

type PreviewRow = {
  rowIndex: number;
  status: "OK" | "ERROR" | "DUPLICATE";
  paidAtIso: string | null;
  amount: number | null;
  purpose?: string | null;
  plotIdMatched?: string | null;
  reference?: string | null;
  category?: string | null;
  targetFundId?: string | null;
  fingerprint?: string | null;
  rawRow: string;
  errors?: string[];
};

type ProcessRow = {
  rowIndex: number;
  paidAtIso: string;
  amount: number;
  purpose?: string | null;
  plotIdMatched: string;
  reference?: string | null;
  category?: string | null;
  targetFundId?: string | null;
  fingerprint?: string | null;
};

const parseDate = (iso: string | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeTotals = (input: unknown) => {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const total = typeof data.total === "number" && Number.isFinite(data.total) ? data.total : 0;
  const valid = typeof data.valid === "number" && Number.isFinite(data.valid) ? data.valid : 0;
  const invalid = typeof data.invalid === "number" && Number.isFinite(data.invalid) ? data.invalid : 0;
  const unmatched = typeof data.unmatched === "number" && Number.isFinite(data.unmatched) ? data.unmatched : 0;
  const duplicates = typeof data.duplicates === "number" && Number.isFinite(data.duplicates) ? data.duplicates : 0;
  return { total, valid, invalid, unmatched, duplicates };
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  if (!hasBillingAccess(user)) return NextResponse.json({ error: "Нет доступа к импорту платежей" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: "Некорректный JSON в теле запроса" }, { status: 400 });
  }
  const fileName = typeof body.fileName === "string" ? body.fileName : null;
  const comment = typeof body.comment === "string" ? body.comment : null;
  const warnings = Array.isArray(body.warnings)
    ? body.warnings.filter((item: unknown): item is string => typeof item === "string")
    : null;
  const totals = normalizeTotals(body.totals) ?? {
    total: 0,
    valid: 0,
    invalid: 0,
    unmatched: 0,
    duplicates: 0,
  };
  const previewRows = Array.isArray(body.previewRows) ? (body.previewRows as PreviewRow[]) : [];
  const rowsToProcess = Array.isArray(body.rows) ? (body.rows as ProcessRow[]) : [];

  if (rowsToProcess.length === 0) {
    return NextResponse.json({ error: "Нет строк для импорта" }, { status: 400 });
  }

  try {
    const batch = createImportBatch({
    fileName,
    importedByUserId: user.id ?? null,
    totalRows: totals.total,
    comment,
  });

  const billingImport = createBillingImport({
    batchId: batch.id,
    createdByUserId: user.id ?? null,
    fileName,
    comment,
    totals,
    warnings,
  });

  const existingPayments = listPayments({});
  const existingFingerprints = new Set(
    existingPayments
      .map((p) => normalizePaymentFingerprint(p))
      .filter((v): v is string => Boolean(v))
  );

  let createdCount = 0;
  let skippedCount = 0;
  const skipped: Array<{ rowIndex: number; reason: string }> = [];

  for (const row of rowsToProcess) {
    const paidAt = parseDate(row.paidAtIso);
    const amount = typeof row.amount === "number" ? row.amount : null;
    const plotId = row.plotIdMatched;
    if (!paidAt || !amount || amount <= 0 || !plotId) {
      skippedCount += 1;
      skipped.push({ rowIndex: row.rowIndex, reason: "invalid" });
      continue;
    }
    const plot = findPlotById(plotId);
    if (!plot) {
      skippedCount += 1;
      skipped.push({ rowIndex: row.rowIndex, reason: "plot_not_found" });
      continue;
    }

    const fingerprint =
      row.fingerprint ||
      buildPaymentFingerprint({
        plotId,
        category: row.category ?? null,
        paidAtIso: paidAt.toISOString(),
        amount,
        purpose: row.purpose ?? null,
        reference: row.reference ?? null,
      });

    if (fingerprint && existingFingerprints.has(fingerprint)) {
      skippedCount += 1;
      skipped.push({ rowIndex: row.rowIndex, reason: "duplicate" });
      continue;
    }

    const year = paidAt.getUTCFullYear();
    const month = paidAt.getUTCMonth() + 1;
    const type = row.category ?? "membership_fee";
    let period = findAccrualPeriod(year, month, type);
    if (!period) {
      period = createAccrualPeriod({ year, month, type });
    }
    if (period) {
      ensureAccrualItem(period.id, plotId);
    }

    addPayment({
      periodId: period?.id ?? "",
      plotId,
      amount,
      paidAt: paidAt.toISOString(),
      method: "bank",
      reference: row.reference ?? null,
      comment: row.purpose ?? null,
      createdByUserId: user.id ?? null,
      importBatchId: batch.id,
      category: row.category ?? null,
      fingerprint: fingerprint ?? null,
      targetFundId: row.targetFundId ?? null,
    });

    if (fingerprint) {
      existingFingerprints.add(fingerprint);
    }

    createdCount += 1;
  }

  const invalidRows = previewRows.filter((row) => row.status !== "OK");
  invalidRows.forEach((row) => {
    const type =
      row.status === "DUPLICATE"
        ? "duplicate"
        : row.plotIdMatched
          ? "invalid"
          : "unmatched";
    addBillingImportError({
      billingImportId: billingImport.id,
      rowIndex: row.rowIndex,
      type,
      reason: row.errors?.[0] ?? row.status,
      rowText: row.rawRow,
    });
  });

  updateImportBatch(
    batch.id,
    { createdCount, skippedCount, warnings: warnings?.map((reason: string) => ({ reason, count: 1 })) ?? null }
  );
  updateBillingImport(billingImport.id, { totals, warnings, status: "completed" });

    await logAdminAction({
      action: "import_payments_csv",
      entity: "billing_import",
      entityId: billingImport.id,
      before: null,
      after: {
        createdCount,
        skippedCount,
        totals,
      },
      comment,
    });

    return NextResponse.json({
      ok: true,
      billingImportId: billingImport.id,
      createdCount,
      skippedCount,
    });
  } catch (error) {
    console.error("[billing-import-confirm] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Внутренняя ошибка при импорте" },
      { status: 500 }
    );
  }
}
