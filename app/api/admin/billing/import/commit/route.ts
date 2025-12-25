import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import {
  addPayment,
  createAccrualPeriod,
  ensureAccrualItem,
  findAccrualPeriod,
  findPlotById,
  listPayments,
  createImportBatch,
  updateImportBatch,
} from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";

type RowInput = {
  rowIndex: number;
  paidAtIso: string;
  amount: number;
  purpose?: string;
  plotIdMatched?: string | null;
  reference?: string | null;
  category?: string | null;
  kwh?: number | null;
  periodKey?: string | null;
};

const parseDate = (iso: string | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const rowsInput = Array.isArray(body.rows) ? (body.rows as RowInput[]) : [];
  const importComment = typeof body.importComment === "string" ? body.importComment : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : null;

  const batch = createImportBatch({
    fileName,
    importedByUserId: user.id ?? null,
    totalRows: rowsInput.length,
    comment: importComment,
  });

  let createdCount = 0;
  let skippedCount = 0;
  const skippedReasons: Record<string, number> = {};
  const created: Array<{
    paymentId: string;
    plotId: string;
    periodId: string;
    amount: number;
    paidAtIso: string;
    reference: string | null;
  }> = [];
  const skipped: Array<{ rowIndex: number; reason: "DUPLICATE" | "INVALID" | "NOT_FOUND" }> = [];

  for (const row of rowsInput) {
    const paidAt = parseDate(row.paidAtIso);
    const amount = typeof row.amount === "number" ? row.amount : null;
    const plotId = row.plotIdMatched ?? null;

    if (!paidAt || !amount || amount <= 0 || !plotId) {
      skippedCount += 1;
      const reason = !plotId ? "NOT_FOUND" : "INVALID";
      skippedReasons[reason] = (skippedReasons[reason] ?? 0) + 1;
      skipped.push({ rowIndex: row.rowIndex, reason });
      continue;
    }

    const plot = findPlotById(plotId);
    if (!plot) {
      skippedCount += 1;
      skippedReasons["NOT_FOUND"] = (skippedReasons["NOT_FOUND"] ?? 0) + 1;
      skipped.push({ rowIndex: row.rowIndex, reason: "NOT_FOUND" });
      continue;
    }

    const paidDay = paidAt.toISOString().split("T")[0];
    const payments = listPayments({});
    let isDuplicate = false;
    if (row.reference) {
      isDuplicate = payments.some((p) => !p.isVoided && p.reference === row.reference);
    } else {
      isDuplicate = payments.some(
        (p) =>
          !p.isVoided &&
          p.plotId === plotId &&
          p.method === "bank" &&
          Math.abs(p.amount - amount) < 1e-9 &&
          (p.paidAt ?? "").startsWith(paidDay)
      );
    }

    if (isDuplicate) {
      skippedCount += 1;
      skippedReasons["DUPLICATE"] = (skippedReasons["DUPLICATE"] ?? 0) + 1;
      skipped.push({ rowIndex: row.rowIndex, reason: "DUPLICATE" });
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

    const payment = addPayment({
      periodId: period?.id ?? "",
      plotId,
      amount,
      paidAt: paidAt.toISOString(),
      method: "bank",
      reference: row.reference ?? null,
      comment: row.purpose ? [row.purpose, importComment].filter(Boolean).join(" | ") : importComment || null,
      createdByUserId: user.id ?? null,
      importBatchId: batch.id,
      category: row.category ?? null,
    });

    createdCount += 1;
    created.push({
      paymentId: payment.id,
      plotId,
      periodId: payment.periodId,
      amount,
      paidAtIso: payment.paidAt,
      reference: payment.reference ?? null,
    });
  }

  const warnings =
    skippedCount > 0
      ? Object.entries(skippedReasons).map(([reason, count]) => ({ reason, count }))
      : null;

  updateImportBatch(batch.id, { createdCount, skippedCount, warnings });

  await logAdminAction({
    action: "import_payments_csv",
    entity: "payment",
    entityId: batch.id,
    before: null,
    after: { createdCount, skippedCount },
    comment: importComment || null,
  });

  return NextResponse.json({ ok: true, createdCount, skippedCount, created, skipped });
}
