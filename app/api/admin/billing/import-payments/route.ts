import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { ok, unauthorized, badRequest, serverError } from "@/lib/api/respond";
import {
  createPaymentImportJob,
  updatePaymentImportJob,
  createImportRowError,
  createPayment,
  listPayments,
} from "@/lib/billing";
import { listPlots } from "@/lib/mockDb";
import { allocatePayment } from "@/lib/billing/services";
import { logAdminAction } from "@/lib/audit";
import crypto from "crypto";
import { normalizePhone } from "@/lib/utils/phone";

// CSV parsing helper
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const pushValue = () => {
    current.push(value.trim());
    value = "";
  };

  const pushRow = () => {
    if (current.length || value) {
      if (value) pushValue();
      if (current.length) rows.push(current);
      current = [];
    }
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        value += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";" || ch === ",") {
        pushValue();
      } else if (ch === "\n") {
        pushRow();
      } else if (ch === "\r") {
        if (next !== "\n") {
          pushRow();
        }
      } else {
        value += ch;
      }
    }
  }
  pushRow();

  return rows;
}

// Detect delimiter
function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

// Parse date (flexible format)
function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Try various formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = trimmed.match(format);
    if (match) {
      if (format === formats[0]) {
        // YYYY-MM-DD
        return new Date(match[0]).toISOString();
      } else {
        // DD.MM.YYYY or DD/MM/YYYY
        const [, day, month, year] = match;
        return new Date(`${year}-${month}-${day}`).toISOString();
      }
    }
  }

  // Try native Date parse
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

// Normalize string for comparison (case-insensitive, trim)
function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

// Match plot by priority: plot number -> phone -> fullname
function matchPlot(
  plotNumber: string | null | undefined,
  phone: string | null | undefined,
  fullName: string | null | undefined,
  plots: ReturnType<typeof listPlots>
): { plotId: string | null; matchType: string | null } {
  // Priority 1: Plot number (exact match, case-insensitive)
  if (plotNumber) {
    const normalized = normalizeString(plotNumber);
    const match = plots.find((p) => normalizeString(p.plotNumber) === normalized || normalizeString(p.number) === normalized);
    if (match) {
      return { plotId: match.id, matchType: "plot_number" };
    }
  }

  // Priority 2: Phone (normalized)
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone) {
      const match = plots.find((p) => {
        if (!p.phone) return false;
        return normalizePhone(p.phone) === normalizedPhone;
      });
      if (match) {
        return { plotId: match.id, matchType: "phone" };
      }
    }
  }

  // Priority 3: Full name (case-insensitive)
  if (fullName) {
    const normalizedName = normalizeString(fullName);
    const match = plots.find((p) => {
      if (!p.ownerFullName) return false;
      return normalizeString(p.ownerFullName) === normalizedName;
    });
    if (match) {
      return { plotId: match.id, matchType: "fullname" };
    }
  }

  return { plotId: null, matchType: null };
}

// Create stable hash for row deduplication
function createRowHash(row: Record<string, string | number | null>): string {
  const key = JSON.stringify({
    date: row.date || row.paidAt || row.paid_at,
    amount: row.amount,
    externalId: row.externalId || row.external_id || row.id || row.operation_number,
  });
  return crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return badRequest(request, "File is required");
    }

  // Read and parse CSV
  const textRaw = await file.text();
  const content = textRaw.replace(/^\uFEFF/, ""); // Remove BOM
  const delimiter = detectDelimiter(content.split("\n")[0] || "");
  const rowsRaw = parseCsv(content);

    if (rowsRaw.length < 2) {
      return badRequest(request, "CSV file must have header and at least one data row");
    }

  const headerRow = rowsRaw[0].map((h) => normalizeString(h));
  const dataRows = rowsRaw.slice(1);

  // Map columns (flexible header matching)
  const col = (keys: string[]): number => {
    for (let i = 0; i < headerRow.length; i++) {
      const normalized = headerRow[i];
      if (keys.some((k) => normalized.includes(k.toLowerCase()))) return i;
    }
    return -1;
  };

  const idxDate = col(["date", "дата", "paid_at", "paidat"]);
  const idxAmount = col(["amount", "сумма", "sum"]);
  const idxExternalId = col(["external_id", "externalid", "id", "operation", "номер", "operation_number"]);
  const idxPlotNumber = col(["plot", "участок", "plot_number", "plotnumber", "number", "номер_участка"]);
  const idxPhone = col(["phone", "телефон", "tel"]);
  const idxFullName = col(["name", "fullname", "имя", "фио", "owner", "owner_name"]);
  const idxComment = col(["comment", "комментарий", "назначение", "purpose", "description"]);

    // Validate required columns
    if (idxDate === -1 || idxAmount === -1) {
      return badRequest(request, "Required columns not found. Expected: date, amount. Found headers: " + headerRow.join(", "));
    }

  // Create import job
  const job = createPaymentImportJob({
    fileName: file instanceof File ? file.name : "import.csv",
    createdByUserId: user?.id ?? null,
    totalRows: dataRows.length,
  });

  // Get all plots for matching
  const plots = listPlots();
  const existingPayments = listPayments({});

  // Track duplicates by externalId and hash
  const seenExternalIds = new Set<string>();
  const seenHashes = new Set<string>();

  let successCount = 0;
  let failedCount = 0;
  let createdPaymentsCount = 0;

  // Process rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2; // +2 for header row and 1-based index

    try {
      // Extract values
      const dateRaw = row[idxDate]?.toString().trim() || null;
      const amountRaw = row[idxAmount]?.toString().trim() || null;
      const externalIdRaw = row[idxExternalId]?.toString().trim() || null;
      const plotNumberRaw = row[idxPlotNumber]?.toString().trim() || null;
      const phoneRaw = row[idxPhone]?.toString().trim() || null;
      const fullNameRaw = row[idxFullName]?.toString().trim() || null;
      const commentRaw = row[idxComment]?.toString().trim() || null;

      // Build row data for error tracking
      const rowData: Record<string, string | number | null> = {};
      headerRow.forEach((h, idx) => {
        rowData[h] = row[idx]?.toString().trim() || null;
      });

      // Validate required fields
      if (!dateRaw || !amountRaw) {
        createImportRowError({
          importJobId: job.id,
          rowIndex,
          type: "validation",
          reason: "Отсутствуют обязательные поля: дата или сумма",
          rowData,
        });
        failedCount++;
        continue;
      }

      // Parse date
      const paidAt = parseDate(dateRaw);
      if (!paidAt) {
        createImportRowError({
          importJobId: job.id,
          rowIndex,
          type: "validation",
          reason: `Некорректная дата: ${dateRaw}`,
          rowData,
        });
        failedCount++;
        continue;
      }

      // Parse amount
      const amount = Number(amountRaw.toString().replace(",", ".").replace(/\s/g, ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        createImportRowError({
          importJobId: job.id,
          rowIndex,
          type: "validation",
          reason: `Некорректная сумма: ${amountRaw}`,
          rowData,
        });
        failedCount++;
        continue;
      }

      // Deduplication by externalId
      if (externalIdRaw) {
        const normalizedExternalId = externalIdRaw.trim();
        // Check in existing payments
        const existingByExternalId = existingPayments.find((p) => p.externalId === normalizedExternalId);
        if (existingByExternalId) {
          createImportRowError({
            importJobId: job.id,
            rowIndex,
            type: "duplicate",
            reason: `Дубликат по externalId: ${normalizedExternalId}`,
            rowData,
          });
          failedCount++;
          continue;
        }
        // Check in current import
        if (seenExternalIds.has(normalizedExternalId)) {
          createImportRowError({
            importJobId: job.id,
            rowIndex,
            type: "duplicate",
            reason: `Дубликат в файле по externalId: ${normalizedExternalId}`,
            rowData,
          });
          failedCount++;
          continue;
        }
        seenExternalIds.add(normalizedExternalId);
      }

      // Deduplication by hash
      const rowHash = createRowHash({
        date: paidAt,
        amount,
        externalId: externalIdRaw,
      });
      if (seenHashes.has(rowHash)) {
        createImportRowError({
          importJobId: job.id,
          rowIndex,
          type: "duplicate",
          reason: "Дубликат строки (одинаковые дата, сумма, externalId)",
          rowData,
        });
        failedCount++;
        continue;
      }
      seenHashes.add(rowHash);

      // Check existing payments by hash
      const existingByHash = existingPayments.find((p) => p.rawRowHash === rowHash);
      if (existingByHash) {
        createImportRowError({
          importJobId: job.id,
          rowIndex,
          type: "duplicate",
          reason: "Дубликат платежа (уже существует в системе)",
          rowData,
        });
        failedCount++;
        continue;
      }

      // Match plot
      const { plotId, matchType } = matchPlot(plotNumberRaw, phoneRaw, fullNameRaw, plots);

      // Create payment (plotId can be null for unmatched)
      const payment = createPayment({
        plotId,
        paidAt,
        amount,
        source: "import",
        externalId: externalIdRaw || null,
        rawRowHash: rowHash,
        comment: commentRaw || null,
      });

      // Allocate payment if plot matched
      if (plotId) {
        try {
          allocatePayment(payment.id);
          successCount++;
          createdPaymentsCount++;
        } catch (allocError) {
          // Log allocation error but payment is created
          createImportRowError({
            importJobId: job.id,
            rowIndex,
            type: "validation",
            reason: `Платеж создан, но не удалось распределить: ${allocError instanceof Error ? allocError.message : "unknown error"}`,
            rowData: { ...rowData, paymentId: payment.id, matchType },
          });
          // Still count as success (payment created) but with warning
          successCount++;
          createdPaymentsCount++;
        }
      } else {
        // Unmatched plot - payment created but not allocated
        createImportRowError({
          importJobId: job.id,
          rowIndex,
          type: "unmatched",
          reason: "Не найден участок (проверьте номер участка, телефон или ФИО). Платеж создан без привязки к участку.",
          rowData: { ...rowData, paymentId: payment.id },
        });
        // Payment is created, so count as success for payment creation, but mark as unmatched error
        successCount++;
        createdPaymentsCount++;
        failedCount++; // Count as failed for matching purposes
      }
    } catch (error) {
      createImportRowError({
        importJobId: job.id,
        rowIndex,
        type: "invalid",
        reason: error instanceof Error ? error.message : "Неизвестная ошибка",
        rowData: headerRow.reduce((acc, h, idx) => {
          acc[h] = row[idx]?.toString().trim() || null;
          return acc;
        }, {} as Record<string, string | number | null>),
      });
      failedCount++;
    }
  }

  // Update job status
  updatePaymentImportJob(job.id, {
    status: "completed",
    successCount,
    failedCount,
    createdPaymentsCount,
    completedAt: new Date().toISOString(),
  });

    await logAdminAction({
      action: "payment_import_completed",
      entity: "payment_import_job",
      entityId: job.id,
      after: {
        fileName: job.fileName,
        totalRows: job.totalRows,
        successCount,
        failedCount,
        createdPaymentsCount,
      },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, {
      job,
      summary: {
        totalRows: job.totalRows,
        successCount,
        failedCount,
        createdPaymentsCount,
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}