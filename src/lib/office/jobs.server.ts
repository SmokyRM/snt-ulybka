import "server-only";

import { Buffer } from "buffer";
import { parseXlsx } from "@/lib/excel";
import { listCharges, listDebts, listPlotEntries, listPayments, addPayment } from "@/lib/billing.store";
import { analyzeImportRows, parseCsv } from "@/lib/billing/import-helpers";
import { matchPaymentToPlot, normalizeStatementRows, parseStatementFile, type StatementTotals } from "@/lib/billing/statementImport";
import { logAdminAction } from "@/lib/audit";
import { logErrorEvent } from "@/lib/errorEvents.store";
import { getOfficeJob, updateOfficeJob } from "./jobs.store";
import type { OfficeJobType } from "./jobs.store";
import { getCampaign, updateCampaign } from "./communications.store";
import { sendCampaign } from "./campaigns.server";

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

const buildCsvImport = async (payload: CsvPayload) => {
  const csvContent = (payload.csvContent ?? "").replace(/^\uFEFF/, "").trim();
  if (!csvContent) {
    throw new Error("CSV файл пуст");
  }
  const rows = parseCsv(csvContent);
  return analyzeImportRows(rows);
};

const buildXlsxImport = async (payload: XlsxPayload) => {
  if (!payload.base64) {
    throw new Error("XLSX файл пуст");
  }
  const buffer = Buffer.from(payload.base64, "base64");
  const rows = await parseXlsx(new Uint8Array(buffer));
  return analyzeImportRows(rows);
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

export async function processOfficeJob(jobId: string) {
  const job = getOfficeJob(jobId);
  if (!job) return;
  if (job.status === "running" || job.status === "done") return;

  updateOfficeJob(jobId, { status: "running", progress: 5 });

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
    }

    updateOfficeJob(jobId, { status: "done", progress: 100, resultData, error: null });

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
      updateOfficeJob(jobId, { status: "queued", progress: 0, error: message, attempts });
      setTimeout(() => void processOfficeJob(jobId), 500);
      return;
    }

    updateOfficeJob(jobId, { status: "failed", progress: 100, error: message, attempts });
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
  if (type === "payments.import.xlsx") return "billing.import.excel";
  if (type === "billing.importStatement") return "billing.import_statement";
  return "billing.import";
};
