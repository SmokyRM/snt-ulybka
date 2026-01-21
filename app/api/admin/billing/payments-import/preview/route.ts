import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { ok, unauthorized, forbidden, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  createPaymentImport,
  createPaymentImportRow,
  updatePaymentImport,
  listPlots,
  findPlotById,
} from "@/lib/mockDb";
import type { PaymentImportRow } from "@/types/snt";
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

function detectDelimiter(firstLine: string): string {
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

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
        return new Date(match[0]).toISOString().split("T")[0];
      } else {
        const [, day, month, year] = match;
        return `${year}-${month}-${day}`;
      }
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

// Match plot by priority: plot number -> phone -> fullname
function matchPlot(
  plotNumber: string | null | undefined,
  phone: string | null | undefined,
  fullName: string | null | undefined,
  plots: ReturnType<typeof listPlots>
): { plotId: string | null; matchType: "plot_number" | "phone" | "fullname" | null } {
  // Priority 1: Plot number
  if (plotNumber) {
    const normalized = normalizeString(plotNumber);
    const match = plots.find(
      (p) => normalizeString(p.plotNumber) === normalized || normalizeString(p.number) === normalized
    );
    if (match) {
      return { plotId: match.id, matchType: "plot_number" };
    }
  }

  // Priority 2: Phone
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

  // Priority 3: Full name (simple case-insensitive match)
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

export async function POST(request: Request) {
  try {
    const accessCheck = await checkAdminOrOfficeAccess(request);
    if (!accessCheck.allowed) {
      return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
    }

    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return badRequest(request, "file is required");
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
  const idxPurpose = col(["purpose", "назначение", "comment", "комментарий", "description"]);
  const idxFullName = col(["name", "fullname", "имя", "фио", "owner", "owner_name", "fio"]);
  const idxPhone = col(["phone", "телефон", "tel"]);
  const idxPlotNumber = col(["plot", "участок", "plot_number", "plotnumber", "number", "номер_участка"]);
  const idxExternalId = col(["external_id", "externalid", "id", "operation", "номер", "operation_number"]);

  // Validate required columns
    if (idxDate === -1 || idxAmount === -1) {
      return badRequest(request, "Required columns not found. Expected: date, amount. Found headers: " + headerRow.join(", "));
    }

  // Create import
  const import_ = createPaymentImport({
    fileName: file instanceof File ? file.name : "import.csv",
    totalRows: dataRows.length,
    createdByUserId: user.id ?? null,
  });

  const plots = listPlots();
  const rows: PaymentImportRow[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  // Process rows
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2; // +2 for header row and 1-based index

    // Extract values
    const dateRaw = row[idxDate]?.toString().trim() || null;
    const amountRaw = row[idxAmount]?.toString().trim() || null;
    const purposeRaw = row[idxPurpose]?.toString().trim() || null;
    const fullNameRaw = row[idxFullName]?.toString().trim() || null;
    const phoneRaw = row[idxPhone]?.toString().trim() || null;
    const plotNumberRaw = row[idxPlotNumber]?.toString().trim() || null;
    const externalIdRaw = row[idxExternalId]?.toString().trim() || null;

    // Build raw data
    const rawData: Record<string, string | number | null> = {};
    headerRow.forEach((h, idx) => {
      rawData[h] = row[idx]?.toString().trim() || null;
    });

    // Validate
    const validationErrors: string[] = [];

    if (!dateRaw) {
      validationErrors.push("Отсутствует дата");
    } else {
      const date = parseDate(dateRaw);
      if (!date) {
        validationErrors.push(`Некорректная дата: ${dateRaw}`);
      }
    }

    if (!amountRaw) {
      validationErrors.push("Отсутствует сумма");
    } else {
      const amount = Number(amountRaw.toString().replace(",", ".").replace(/\s/g, ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        validationErrors.push(`Некорректная сумма: ${amountRaw}`);
      }
    }

    // Match plot if valid
    let matchedPlotId: string | null = null;
    let matchType: "plot_number" | "phone" | "fullname" | "manual" | null = null;

    if (validationErrors.length === 0) {
      const match = matchPlot(plotNumberRaw, phoneRaw, fullNameRaw, plots);
      matchedPlotId = match.plotId;
      matchType = match.matchType;
      if (matchedPlotId) {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }

    const date = parseDate(dateRaw);
    const amount = dateRaw && amountRaw ? Number(amountRaw.toString().replace(",", ".").replace(/\s/g, "")) : 0;

    const importRow = createPaymentImportRow({
      importId: import_.id,
      rowIndex,
      date: date || "",
      amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
      purpose: purposeRaw || null,
      fullName: fullNameRaw || null,
      phone: phoneRaw || null,
      plotNumber: plotNumberRaw || null,
      externalId: externalIdRaw || null,
      matchedPlotId,
      matchType,
      validationErrors: validationErrors.length > 0 ? validationErrors : null,
      rawData,
    });

    rows.push(importRow);
  }

  // Update import stats
  updatePaymentImport(import_.id, {
    matchedRows: matchedCount,
    unmatchedRows: unmatchedCount,
  });

    return ok(request, {
      import: import_,
      rows: rows.map((r) => ({
      id: r.id,
      rowIndex: r.rowIndex,
      date: r.date,
      amount: r.amount,
      purpose: r.purpose,
      fullName: r.fullName,
      phone: r.phone,
      plotNumber: r.plotNumber,
      externalId: r.externalId,
      matchedPlotId: r.matchedPlotId,
      matchType: r.matchType,
      validationErrors: r.validationErrors,
      plot: r.matchedPlotId
        ? (() => {
            const plot = findPlotById(r.matchedPlotId!);
            return plot
              ? {
                  id: plot.id,
                  plotNumber: plot.plotNumber,
                  street: plot.street,
                  ownerFullName: plot.ownerFullName,
                }
              : null;
          })()
        : null,
    })),
      summary: {
        total: rows.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        withErrors: rows.filter((r) => r.validationErrors && r.validationErrors.length > 0).length,
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
