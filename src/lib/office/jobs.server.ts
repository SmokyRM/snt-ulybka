import "server-only";

import { Buffer } from "buffer";
import { createHash } from "crypto";
import { parseXlsx } from "@/lib/excel";
import { listCharges, listDebts, listPlotEntries, listPayments, addPayment } from "@/lib/billing.store";
import { parseCsv } from "@/lib/billing/import-helpers";
import { matchPaymentToPlot, normalizeStatementRows, parseStatementFile, type StatementTotals } from "@/lib/billing/statementImport";
import { hasPgConnection, insertPayments } from "@/lib/billing/payments.pg";
import { logAdminAction } from "@/lib/audit";
import { logErrorEvent } from "@/lib/errorEvents.store";
import { getOfficeJob, updateOfficeJob } from "./jobs.store";
import type { OfficeJobType } from "./jobs.store";
import { getCampaign, updateCampaign } from "./communications.store";
import { sendCampaign } from "./campaigns.server";
import { sendDraft } from "./notifications.pg";

const JOB_TIMEOUT_MS = 10000;

type ReceiptsPayload = {
  period?: string | null;
  minDebt?: number | null;
  plotIds?: string[] | null;
  filter?: "all" | "debtors" | "has_accruals" | null;
  limit?: number | null;
};

type CsvPayload = {
  csvContent: string;
  mode?: string | null;
};

type XlsxPayload = {
  base64: string;
  mode?: string | null;
};

type StatementPayload = {
  base64: string;
  fileName?: string | null;
};

type MonthlyBatchPayload = {
  periods: string[];
};

type CampaignSendPayload = {
  campaignId: string;
};

const runWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const buildReceiptsBatch = async (payload: ReceiptsPayload) => {
  const period = payload.period ?? new Date().toISOString().slice(0, 7);
  const minDebt = payload.minDebt ?? 0;
  const plotIds = payload.plotIds ?? null;

  let debts = listDebts().filter((d) => d.debt >= minDebt);
  if (plotIds && plotIds.length > 0) {
    debts = debts.filter((d) => plotIds.includes(d.key));
  }

  if (debts.length > 500) {
    throw new Error("Слишком много квитанций. Уточните фильтр (максимум 500).");
  }

  const links = debts.map((debt) => {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("minDebt", String(minDebt));
    params.set("plotIds", debt.key);
    return {
      plotId: debt.key,
      plotLabel: debt.plotId,
      residentName: debt.residentName,
      url: `/api/office/billing/receipts/pdf?${params.toString()}`,
    };
  });

  return {
    period,
    count: links.length,
    links,
    message: "Сформирован список ссылок на квитанции.",
  };
};

const buildReceiptsBatchPdf = async (payload: ReceiptsPayload) => {
  const period = payload.period ?? new Date().toISOString().slice(0, 7);
  const filter = payload.filter ?? "debtors";
  const limit = Math.min(500, Math.max(1, Number(payload.limit ?? 500)));
  const plotIds = payload.plotIds ?? null;

  let plotIdsList: string[] = [];
  if (plotIds && plotIds.length > 0) {
    plotIdsList = plotIds;
  } else if (filter === "debtors") {
    plotIdsList = listDebts().filter((d) => d.debt > 0).map((d) => d.key);
  } else if (filter === "has_accruals") {
    const plotsWithCharges = new Set(listCharges().map((c) => c.plotId));
    plotIdsList = listPlotEntries()
      .map((p) => p.plotId)
      .filter((id) => plotsWithCharges.has(id));
  } else {
    plotIdsList = listPlotEntries().map((p) => p.plotId);
  }

  if (plotIdsList.length > limit) {
    plotIdsList = plotIdsList.slice(0, limit);
  }

  const failures: Array<{ plotId: string; message: string }> = [];
  const links = plotIdsList.map((plotId) => {
    if (!plotId) {
      failures.push({ plotId, message: "Неверный участок" });
      return null;
    }
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("plotIds", plotId);
    return {
      plotId,
      url: `/api/office/billing/receipts/pdf?${params.toString()}`,
    };
  }).filter(Boolean) as Array<{ plotId: string; url: string }>;

  return {
    period,
    count: links.length,
    links,
    failures: failures.slice(0, 20),
    message: "Сформирован список PDF ссылок на квитанции.",
  };
};

type ParsedPaymentRow = {
  rowIndex: number;
  paidAt: string;
  amount: number;
  plotNumber: string;
  payer: string;
};

const normalizeImportValue = (value: string | null | undefined) => (value ?? "").trim();

const parseImportDate = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(match[0]);
  const matchRu = trimmed.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (matchRu) return new Date(`${matchRu[3]}-${matchRu[2]}-${matchRu[1]}`);
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseImportRows = (rows: string[][]) => {
  if (rows.length < 2) {
    return {
      totals: { total: 0, valid: 0, invalid: 0 },
      errors: [{ rowIndex: 0, message: "CSV должен содержать заголовок и строки данных" }],
      validRows: [] as ParsedPaymentRow[],
    };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().trim());
  const findHeaderIndex = (keys: string[]) =>
    headerRow.findIndex((value) => keys.some((key) => value.includes(key)));
  const idxDate = findHeaderIndex(["date", "дата"]);
  const idxAmount = findHeaderIndex(["amount", "сумма"]);
  const idxPlot = findHeaderIndex(["plot", "участок"]);
  const idxPayer = findHeaderIndex(["payer", "платель", "фио", "owner", "name"]);

  if (idxDate === -1 || idxAmount === -1 || idxPlot === -1 || idxPayer === -1) {
    return {
      totals: { total: rows.length - 1, valid: 0, invalid: rows.length - 1 },
      errors: [{ rowIndex: 0, message: "Нужны колонки: date, amount, plot, payer" }],
      validRows: [] as ParsedPaymentRow[],
    };
  }

  const errors: Array<{ rowIndex: number; message: string }> = [];
  const validRows: ParsedPaymentRow[] = [];
  let valid = 0;
  let invalid = 0;

  rows.slice(1).forEach((row, index) => {
    const rowIndex = index + 2;
    const dateRaw = normalizeImportValue(row[idxDate]);
    const amountRaw = normalizeImportValue(row[idxAmount]);
    const plotRaw = normalizeImportValue(row[idxPlot]);
    const payerRaw = normalizeImportValue(row[idxPayer]);

    const rowErrors: string[] = [];
    const parsedDate = parseImportDate(dateRaw);
    if (!parsedDate) rowErrors.push("Неверная дата");
    const amount = Number(amountRaw.replace(/\s+/g, "").replace(",", "."));
    if (!Number.isFinite(amount)) rowErrors.push("Неверная сумма");
    if (!plotRaw) rowErrors.push("Участок обязателен");
    if (!payerRaw) rowErrors.push("Плательщик обязателен");

    if (rowErrors.length || !parsedDate) {
      invalid += 1;
      errors.push({ rowIndex, message: rowErrors.join("; ") || "Неверные данные" });
    } else {
      valid += 1;
      validRows.push({
        rowIndex,
        paidAt: parsedDate.toISOString().slice(0, 10),
        amount,
        plotNumber: plotRaw,
        payer: payerRaw,
      });
    }
  });

  return {
    totals: { total: rows.length - 1, valid, invalid },
    errors,
    validRows,
  };
};

const handleImportRows = async (rows: string[][], mode: string | null, source: string) => {
  const parsed = parseImportRows(rows);
  if (mode !== "apply") {
    return { totals: parsed.totals, errors: parsed.errors };
  }

  if (parsed.validRows.length) {
    const now = new Date();
    if (hasPgConnection()) {
      await insertPayments(
        parsed.validRows.map((row) => ({
          plotNumber: row.plotNumber,
          paidAt: row.paidAt,
          amount: row.amount,
          payer: row.payer,
          source,
          rawRowHash: createHash("sha256")
            .update(`${row.paidAt}|${row.amount}|${row.plotNumber}|${row.payer}`)
            .digest("hex"),
          purpose: `Импорт ${now.toISOString().slice(0, 10)}`,
        })),
      );
    } else {
      parsed.validRows.forEach((row) => {
        addPayment({
          plotId: row.plotNumber,
          residentId: "unknown",
          amount: row.amount,
          method: "bank",
          date: row.paidAt,
          payer: row.payer,
          status: "matched",
          matchStatus: "matched",
          matchedPlotId: row.plotNumber,
        });
      });
    }
  }

  return { totals: parsed.totals, errors: parsed.errors };
};

const buildCsvImport = async (payload: CsvPayload) => {
  const csvContent = (payload.csvContent ?? "").replace(/^\uFEFF/, "").trim();
  if (!csvContent) {
    throw new Error("CSV файл пуст");
  }
  const rows = parseCsv(csvContent);
  return handleImportRows(rows, payload.mode ?? null, "payments.import.csv");
};

const buildXlsxImport = async (payload: XlsxPayload) => {
  if (!payload.base64) {
    throw new Error("XLSX файл пуст");
  }
  const buffer = Buffer.from(payload.base64, "base64");
  const rows = await parseXlsx(new Uint8Array(buffer));
  return handleImportRows(rows, payload.mode ?? null, "payments.import.xlsx");
};

const buildStatementImport = async (payload: StatementPayload) => {
  if (!payload.base64) {
    throw new Error("Файл выписки пуст");
  }
  const buffer = Buffer.from(payload.base64, "base64");
  const rows = await parseStatementFile({ buffer: buffer.buffer, filename: payload.fileName ?? null });
  const parsed = normalizeStatementRows(rows);
  const errors = parsed.errors;

  const existing = listPayments();
  const existingKeys = new Set(
    existing.map((payment) => {
      const key = payment.bankRef
        ? `ref:${payment.bankRef}`
        : `hash:${payment.date}|${payment.amount}|${payment.payer ?? ""}|${payment.purpose ?? ""}`;
      return key;
    }),
  );

  let imported = 0;
  let matched = 0;
  let ambiguous = 0;
  let unmatched = 0;
  let duplicates = 0;
  let skippedOut = 0;

  parsed.rows.forEach((row) => {
    if (row.direction === "out") {
      skippedOut += 1;
      return;
    }

    const key = row.bankRef
      ? `ref:${row.bankRef}`
      : `hash:${row.date}|${row.amount}|${row.payerName}|${row.purpose}`;

    if (existingKeys.has(key)) {
      duplicates += 1;
      return;
    }

    const match = matchPaymentToPlot({ purpose: row.purpose, payerName: row.payerName });
    const matchedPlotId = match.matchedPlotId ?? "unknown";
    const status =
      match.matchStatus === "matched" ? "matched" : match.matchStatus === "ambiguous" ? "needs_review" : "unmatched";

    addPayment({
      plotId: matchedPlotId,
      residentId: "unknown",
      amount: row.amount,
      method: "bank",
      date: row.date,
      payer: row.payerName,
      purpose: row.purpose,
      bankRef: row.bankRef,
      direction: row.direction,
      status,
      matchStatus: match.matchStatus,
      matchCandidates: match.matchCandidates,
      matchedPlotId: match.matchedPlotId,
      matchConfidence: match.matchConfidence,
      matchReason: match.matchReason,
    });

    existingKeys.add(key);
    imported += 1;
    if (match.matchStatus === "matched") matched += 1;
    if (match.matchStatus === "ambiguous") ambiguous += 1;
    if (match.matchStatus === "unmatched") unmatched += 1;
  });

  const totals: StatementTotals = {
    total: parsed.rows.length,
    imported,
    matched,
    ambiguous,
    unmatched,
    duplicates,
    skippedOut,
  };

  return { totals, errors };
};

const buildMonthlyReportBatch = async (payload: MonthlyBatchPayload) => {
  const periods = Array.isArray(payload.periods) ? payload.periods : [];
  const valid = periods.filter((p) => /^\d{4}-\d{2}$/.test(p));
  if (!valid.length) {
    throw new Error("Не указаны периоды");
  }
  const unique = Array.from(new Set(valid)).slice(0, 24);
  const links = unique.map((period) => ({
    period,
    url: `/api/office/reports/monthly.pdf?period=${period}`,
  }));
  return {
    count: links.length,
    links,
    message: "Сформирован список PDF отчётов.",
  };
};

const summarizeJobResult = (type: OfficeJobType, data: Record<string, unknown> | null) => {
  if (!data) return null;
  if (type === "payments.import.csv" || type === "payments.import.xlsx") {
    const totals = (data as { totals?: unknown }).totals ?? null;
    const errors = Array.isArray((data as { errors?: unknown }).errors)
      ? (data as { errors: unknown[] }).errors.slice(0, 20)
      : [];
    return { totals, errors };
  }
  if (type === "billing.importStatement") {
    const totals = (data as { totals?: unknown }).totals ?? null;
    const errors = Array.isArray((data as { errors?: unknown }).errors)
      ? (data as { errors: unknown[] }).errors.slice(0, 20)
      : [];
    return { totals, errors };
  }
  if (type === "receipts.batch" || type === "receipts.batchPdf") {
    const count = (data as { count?: unknown }).count ?? null;
    const failures = Array.isArray((data as { failures?: unknown }).failures)
      ? (data as { failures: unknown[] }).failures.slice(0, 20)
      : [];
    const links = Array.isArray((data as { links?: unknown }).links)
      ? (data as { links: unknown[] }).links.slice(0, 10)
      : [];
    return { count, failures, links };
  }
  if (type === "reports.monthlyPdfBatch") {
    const count = (data as { count?: unknown }).count ?? null;
    const links = Array.isArray((data as { links?: unknown }).links)
      ? (data as { links: unknown[] }).links.slice(0, 10)
      : [];
    return { count, links };
  }
  return data;
};

export async function processOfficeJob(jobId: string) {
  const job = await getOfficeJob(jobId);
  if (!job) return;
  if (job.status === "running" || job.status === "done") return;

  await updateOfficeJob(jobId, { status: "running", progress: 5 });

  try {
    let resultData: Record<string, unknown> | null = null;

    if (job.type === "receipts.batch") {
      resultData = await runWithTimeout(buildReceiptsBatch(job.payload as ReceiptsPayload), JOB_TIMEOUT_MS);
    } else if (job.type === "receipts.batchPdf") {
      resultData = await runWithTimeout(buildReceiptsBatchPdf(job.payload as ReceiptsPayload), JOB_TIMEOUT_MS);
    } else if (job.type === "payments.import.csv") {
      resultData = await runWithTimeout(buildCsvImport(job.payload as CsvPayload), JOB_TIMEOUT_MS);
    } else if (job.type === "payments.import.xlsx") {
      resultData = await runWithTimeout(buildXlsxImport(job.payload as XlsxPayload), JOB_TIMEOUT_MS);
    } else if (job.type === "billing.importStatement") {
      resultData = await runWithTimeout(buildStatementImport(job.payload as StatementPayload), JOB_TIMEOUT_MS);
      await logAdminAction({
        action: "statement.import.finish",
        entity: "billing.importStatement",
        entityId: job.id,
        route: "/api/office/jobs",
        success: true,
        meta: resultData ?? {},
      });
    } else if (job.type === "reports.monthlyPdfBatch") {
      resultData = await runWithTimeout(buildMonthlyReportBatch(job.payload as MonthlyBatchPayload), JOB_TIMEOUT_MS);
    } else if (job.type === "notifications.campaignSend") {
      const payload = job.payload as CampaignSendPayload;
      const campaign = getCampaign(payload.campaignId);
      if (!campaign) {
        throw new Error("Campaign not found");
      }
      updateCampaign(campaign.id, { status: "sending" });
      resultData = await runWithTimeout(sendCampaign(campaign, job.requestId ?? null), JOB_TIMEOUT_MS);
      await logAdminAction({
        action: "campaign.send.finish",
        entity: "campaign",
        entityId: campaign.id,
        route: "/api/office/jobs",
        success: true,
        meta: resultData ?? {},
      });
    } else if (job.type === "notifications.send") {
      const payload = job.payload as { draftId?: string };
      const draftId = payload.draftId;
      if (!draftId) {
        throw new Error("Draft not found");
      }
      resultData = await runWithTimeout(sendDraft(draftId, job.requestId ?? null), JOB_TIMEOUT_MS);
      await logAdminAction({
        action: "notifications.send.finish",
        entity: "notification_draft",
        entityId: draftId,
        route: "/api/office/jobs",
        success: true,
        meta: resultData ?? {},
      });
    }

    const resultSummary = summarizeJobResult(job.type, resultData);
    await updateOfficeJob(jobId, { status: "done", progress: 100, resultData: resultSummary, error: null });

    await logAdminAction({
      action: "job.finish",
      entity: job.type,
      entityId: jobId,
      route: "/api/office/jobs",
      success: true,
      meta: { type: job.type },
    });
  } catch (error) {
    const attempts = job.attempts + 1;
    const message = error instanceof Error ? error.message : "Ошибка выполнения задания";

    if (attempts < job.maxAttempts) {
      await updateOfficeJob(jobId, { status: "queued", progress: 0, error: message, attempts });
      setTimeout(() => void processOfficeJob(jobId), 500);
      return;
    }

    await updateOfficeJob(jobId, { status: "failed", progress: 100, error: message, attempts });
    logErrorEvent({
      source: "job",
      key: job.type,
      message,
      stack: error instanceof Error ? error.stack ?? null : null,
      route: "/api/office/jobs",
      requestId: job.requestId ?? null,
    });

    await logAdminAction({
      action: "job.fail",
      entity: job.type,
      entityId: jobId,
      route: "/api/office/jobs",
      success: false,
      deniedReason: message,
      meta: { type: job.type },
    });
  }
}

export function enqueueOfficeJob(jobId: string) {
  setTimeout(() => void processOfficeJob(jobId), 0);
}

export const getJobPermissionAction = (type: OfficeJobType) => {
  if (type === "receipts.batch" || type === "receipts.batchPdf") return "billing.receipts";
  if (type === "reports.monthlyPdfBatch") return "billing.export";
  if (type === "notifications.campaignSend") return "notifications.send";
  if (type === "notifications.send") return "notifications.send";
  if (type === "payments.import.xlsx") return "billing.import.excel";
  if (type === "billing.importStatement") return "billing.import_statement";
  return "billing.import";
};
