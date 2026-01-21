import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activityLog.store";
import { listFinance } from "@/lib/finance.store";
import { listPayments, addPayment as addPaymentToDb } from "@/lib/mockDb";
import { findRegistryByPlotNumber } from "@/lib/registry.store";
import { randomUUID } from "node:crypto";

export type FinanceDebtsSummary = {
  totalDebt: number;
  debtorsCount: number;
  collected30d: number;
  totalAccrued: number;
  totalPaid: number;
};

export type ImportPreviewRow = {
  rowIndex: number;
  date: string;
  amount: number;
  plotNumber: string;
  purpose: string;
  status: "OK" | "ERROR" | "DUPLICATE";
  errors: string[];
  matchedPlotId?: string;
};

export type ImportPreview = {
  rows: ImportPreviewRow[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
};

export type FinanceExport = {
  id: string;
  type: "payments" | "debts" | "summary";
  createdAt: string;
  createdBy: string;
  filename: string;
  rowCount: number;
};

// In-memory store для экспортов (в будущем можно заменить на БД)
const exports: FinanceExport[] = [];

/**
 * Получить сводку по долгам
 */
export async function getDebtsSummary(): Promise<FinanceDebtsSummary> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверка прав на чтение финансов
  try {
    assertCan(role, "finance.read", undefined);
  } catch {
    throw new Error("FORBIDDEN");
  }

  const financeData = listFinance({});
  const totalDebt = financeData.reduce((sum, row) => (row.balance < 0 ? sum + Math.abs(row.balance) : sum), 0);
  const debtorsCount = financeData.filter((row) => row.balance < 0).length;
  const totalAccrued = financeData.reduce((sum, row) => sum + (row.accrued || 0), 0);
  const totalPaid = financeData.reduce((sum, row) => sum + (row.paid || 0), 0);

  // Собранные за последние 30 дней
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const allPayments = listPayments({});
  const recentPayments = allPayments.filter(
    (p) => new Date(p.createdAt).getTime() >= thirtyDaysAgo.getTime()
  );
  const collected30d = recentPayments.reduce((sum, p) => sum + p.amount, 0);

  return {
    totalDebt,
    debtorsCount,
    collected30d,
    totalAccrued,
    totalPaid,
  };
}

/**
 * Предпросмотр импорта платежей из CSV
 */
export async function previewImport(
  csvContent: string,
  mapping?: Record<string, string>
): Promise<ImportPreview> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверка прав на изменение финансов
  try {
    assertCan(role, "finance.mutate", undefined);
  } catch {
    throw new Error("FORBIDDEN");
  }

  // Простой парсер CSV (можно улучшить)
  const lines = csvContent
    .replace(/^\uFEFF/, "") // remove BOM
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV должен содержать заголовок и хотя бы одну строку данных");
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);
  const normalizedHeaders = headers.map((h) => normalizeHeader(h));

  // Определение индексов колонок
  const getColIndex = (keys: string[]): number => {
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const normalized = normalizedHeaders[i];
      if (keys.includes(normalized)) return i;
    }
    return -1;
  };

  const idxDate = mapping?.date ? headers.findIndex((h) => h.trim() === mapping.date?.trim()) : getColIndex(["date", "дата", "paidat"]);
  const idxAmount = mapping?.amount ? headers.findIndex((h) => h.trim() === mapping.amount?.trim()) : getColIndex(["amount", "сумма", "sum"]);
  const idxPlot = mapping?.plotNumber ? headers.findIndex((h) => h.trim() === mapping.plotNumber?.trim()) : getColIndex(["plot", "участок", "plotnumber"]);
  const idxPurpose = mapping?.purpose ? headers.findIndex((h) => h.trim() === mapping.purpose?.trim()) : getColIndex(["purpose", "назначение", "description"]);

  // Валидация обязательных колонок
  const missing: string[] = [];
  if (idxDate < 0) missing.push("Дата");
  if (idxAmount < 0) missing.push("Сумма");
  if (missing.length > 0) {
    throw new Error(`Отсутствуют обязательные колонки: ${missing.join(", ")}`);
  }

  const existingPayments = listPayments({});
  const existingFingerprints = new Set(
    existingPayments.map((p) => `${p.createdAt}_${p.amount}_${p.plotId}`)
  );

  const rows: ImportPreviewRow[] = [];
  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (let i = 1; i < lines.length && i <= 1000; i++) {
    const line = lines[i];
    const cells = parseCsvLine(line);
    const rowIndex = i + 1;

    const dateVal = idxDate >= 0 ? cells[idxDate]?.trim() : "";
    const amountVal = idxAmount >= 0 ? cells[idxAmount]?.trim() : "";
    const plotVal = idxPlot >= 0 ? cells[idxPlot]?.trim() : "";
    const purposeVal = idxPurpose >= 0 ? cells[idxPurpose]?.trim() : "";

    const errors: string[] = [];
    let date: string | null = null;
    let amount: number | null = null;
    const plotNumber = plotVal || "";

    // Парсинг даты
    if (!dateVal) {
      errors.push("Отсутствует дата");
    } else {
      const parsedDate = parseDate(dateVal);
      if (!parsedDate) {
        errors.push(`Неверный формат даты: ${dateVal}`);
      } else {
        date = parsedDate;
      }
    }

    // Парсинг суммы
    if (!amountVal) {
      errors.push("Отсутствует сумма");
    } else {
      const parsedAmount = parseAmount(amountVal);
      if (parsedAmount === null || parsedAmount <= 0) {
        errors.push(`Неверная сумма: ${amountVal}`);
      } else {
        amount = parsedAmount;
      }
    }

    // Проверка на дубликаты
    let isDuplicate = false;
    if (date && amount) {
      const fingerprint = `${date}_${amount}_${plotNumber}`;
      if (existingFingerprints.has(fingerprint)) {
        isDuplicate = true;
        duplicateCount++;
      }
    }

    const status: "OK" | "ERROR" | "DUPLICATE" = isDuplicate ? "DUPLICATE" : errors.length > 0 ? "ERROR" : "OK";
    if (status === "OK") validCount++;
    if (status === "ERROR") errorCount++;

    rows.push({
      rowIndex,
      date: date || dateVal,
      amount: amount || 0,
      plotNumber,
      purpose: purposeVal || "",
      status,
      errors,
    });
  }

  return {
    rows,
    totalRows: rows.length,
    validRows: validCount,
    errorRows: errorCount,
    duplicateRows: duplicateCount,
  };
}

/**
 * Подтверждение импорта платежей
 */
export async function confirmImport(rows: ImportPreviewRow[]): Promise<{ imported: number; skipped: number }> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверка прав на изменение финансов
  try {
    assertCan(role, "finance.mutate", undefined);
  } catch {
    throw new Error("FORBIDDEN");
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.status !== "OK") {
      skipped++;
      continue;
    }

    // Находим участок по номеру
    const registryItem = findRegistryByPlotNumber(row.plotNumber);
    if (!registryItem) {
      skipped++;
      continue;
    }

    // Используем id из registry как plotId, иначе используем plotNumber
    const plotId = registryItem.id || row.plotNumber;
    
    // Создаём период на основе даты платежа
    const paymentDate = new Date(row.date);
    const periodId = `period-${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`;

    addPaymentToDb({
      periodId,
      plotId,
      amount: row.amount,
      paidAt: row.date,
      method: "bank", // По умолчанию банк
      comment: row.purpose || null,
      createdByUserId: user.id,
    });

    imported++;
  }

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "finance",
    entityId: "import",
    action: "import",
    payload: {
      imported,
      skipped,
      totalRows: rows.length,
    },
  });

  return { imported, skipped };
}

/**
 * Получить список экспортов
 */
export async function listExports(): Promise<FinanceExport[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверка прав на чтение финансов
  try {
    assertCan(role, "finance.read", undefined);
  } catch {
    throw new Error("FORBIDDEN");
  }

  return [...exports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Создать экспорт
 */
export async function createExport(
  type: "payments" | "debts" | "summary",
  filename: string,
  rowCount: number
): Promise<FinanceExport> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }

  // Проверка прав на экспорт
  try {
    assertCan(role, "finance.export", undefined);
  } catch {
    throw new Error("FORBIDDEN");
  }

  const exportRecord: FinanceExport = {
    id: randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    filename,
    rowCount,
  };

  exports.push(exportRecord);

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "finance",
    entityId: exportRecord.id,
    action: "export",
    payload: {
      type,
      filename,
      rowCount,
    },
  });

  return exportRecord;
}

// Вспомогательные функции

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\s-]/g, "")
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: "a",
        б: "b",
        в: "v",
        г: "g",
        д: "d",
        е: "e",
        ё: "e",
        ж: "zh",
        з: "z",
        и: "i",
        й: "y",
        к: "k",
        л: "l",
        м: "m",
        н: "n",
        о: "o",
        п: "p",
        р: "r",
        с: "s",
        т: "t",
        у: "u",
        ф: "f",
        х: "h",
        ц: "ts",
        ч: "ch",
        ш: "sh",
        щ: "sch",
        ъ: "",
        ы: "y",
        ь: "",
        э: "e",
        ю: "yu",
        я: "ya",
      };
      return map[char] || char;
    });
}

function parseDate(dateStr: string): string | null {
  // Попытка парсинга различных форматов
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /^(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return dateStr; // Уже в ISO формате
      } else if (format === formats[1] || format === formats[2]) {
        const [, d1, d2, y] = match;
        return `${y}-${d2}-${d1}`;
      }
    }
  }

  // Попытка парсинга через Date
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseAmount(amountStr: string): number | null {
  // Удаляем пробелы, запятые (как разделители тысяч), и другие символы
  const cleaned = amountStr.replace(/[,\s]/g, "").replace(/[₽$€]/g, "");
  const parsed = parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}
