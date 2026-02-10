import { sql } from "@/db/client";
import crypto from "crypto";

export type ImportDryRunRow = {
  rowNumber: number;
  date: string | null;
  amount: number | null;
  plotNumber: string | null;
  payer: string | null;
  externalId: string | null;
  rawRowHash: string;
  status: "will_create" | "will_skip" | "error";
  errorCode?: string;
  errorMessage?: string;
  errorHint?: string;
};

export type ImportDryRunResult = {
  summary: {
    total: number;
    willCreate: number;
    willSkip: number;
    errors: number;
  };
  rows: ImportDryRunRow[];
  errors: Array<{
    rowNumber: number;
    code: string;
    message: string;
    hint?: string;
  }>;
};

const normalize = (value: string | null | undefined) => (value ?? "").trim();

const parseDate = (raw: string): Date | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(match[0]);
  const matchRu = trimmed.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (matchRu) return new Date(`${matchRu[3]}-${matchRu[2]}-${matchRu[1]}`);
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const findHeaderIndex = (headers: string[], keys: string[]) => {
  for (let i = 0; i < headers.length; i++) {
    const value = headers[i];
    if (keys.some((key) => value.includes(key))) {
      return i;
    }
  }
  return -1;
};

function computeRowHash(row: string[]): string {
  const content = row.join("|").toLowerCase().replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 32);
}

export async function importDryRun(csvRows: string[][]): Promise<ImportDryRunResult> {
  const result: ImportDryRunResult = {
    summary: { total: 0, willCreate: 0, willSkip: 0, errors: 0 },
    rows: [],
    errors: [],
  };

  if (csvRows.length < 2) {
    result.errors.push({
      rowNumber: 0,
      code: "EMPTY_FILE",
      message: "CSV файл пуст или не содержит данных",
      hint: "Добавьте заголовок и строки с данными",
    });
    return result;
  }

  const headerRow = csvRows[0].map((h) => h.toLowerCase().trim());
  const idxDate = findHeaderIndex(headerRow, ["date", "дата"]);
  const idxAmount = findHeaderIndex(headerRow, ["amount", "сумма"]);
  const idxPlot = findHeaderIndex(headerRow, ["plot", "участок"]);
  const idxPayer = findHeaderIndex(headerRow, ["payer", "платель", "фио", "owner", "name"]);
  const idxExternalId = findHeaderIndex(headerRow, ["external_id", "id", "номер"]);

  const missingColumns: string[] = [];
  if (idxDate === -1) missingColumns.push("date/дата");
  if (idxAmount === -1) missingColumns.push("amount/сумма");
  if (idxPlot === -1) missingColumns.push("plot/участок");
  if (idxPayer === -1) missingColumns.push("payer/плательщик");

  if (missingColumns.length > 0) {
    result.errors.push({
      rowNumber: 1,
      code: "MISSING_COLUMNS",
      message: `Отсутствуют обязательные колонки: ${missingColumns.join(", ")}`,
      hint: "Проверьте заголовки CSV файла",
    });
    return result;
  }

  // Collect all row hashes for DB lookup
  const rowHashes: string[] = [];
  const rowData: Array<{
    rowNumber: number;
    date: string | null;
    amount: number | null;
    plotNumber: string | null;
    payer: string | null;
    externalId: string | null;
    rawRowHash: string;
    validationErrors: string[];
  }> = [];

  for (let i = 1; i < csvRows.length; i++) {
    const row = csvRows[i];
    const rowNumber = i + 1;

    const dateRaw = normalize(row[idxDate]);
    const amountRaw = normalize(row[idxAmount]);
    const plotNumber = normalize(row[idxPlot]);
    const payer = normalize(row[idxPayer]);
    const externalId = idxExternalId !== -1 ? normalize(row[idxExternalId]) || null : null;
    const rawRowHash = computeRowHash(row);

    const validationErrors: string[] = [];

    const parsedDate = parseDate(dateRaw);
    if (!parsedDate) validationErrors.push("Неверный формат даты");

    const amount = Number(amountRaw.replace(/\s+/g, "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) validationErrors.push("Неверная сумма");

    if (!plotNumber) validationErrors.push("Участок обязателен");
    if (!payer) validationErrors.push("Плательщик обязателен");

    rowHashes.push(rawRowHash);
    rowData.push({
      rowNumber,
      date: parsedDate ? parsedDate.toISOString().slice(0, 10) : null,
      amount: Number.isFinite(amount) ? amount : null,
      plotNumber: plotNumber || null,
      payer: payer || null,
      externalId,
      rawRowHash,
      validationErrors,
    });
  }

  // Check for existing hashes in DB
  const existingHashes = new Set<string>();
  if (rowHashes.length > 0) {
    const hashValues = rowHashes.map((h) => sql`${h}`);
    const existing = await sql<{ raw_row_hash: string }[]>`
      select raw_row_hash
      from billing_payments
      where raw_row_hash in (${sql.join(hashValues, sql`, `)})
    `;
    existing.forEach((r: { raw_row_hash: string }) => existingHashes.add(r.raw_row_hash));
  }

  // Process each row
  for (const row of rowData) {
    result.summary.total++;

    if (row.validationErrors.length > 0) {
      result.summary.errors++;
      const dryRunRow: ImportDryRunRow = {
        rowNumber: row.rowNumber,
        date: row.date,
        amount: row.amount,
        plotNumber: row.plotNumber,
        payer: row.payer,
        externalId: row.externalId,
        rawRowHash: row.rawRowHash,
        status: "error",
        errorCode: "VALIDATION_ERROR",
        errorMessage: row.validationErrors.join("; "),
      };
      result.rows.push(dryRunRow);
      result.errors.push({
        rowNumber: row.rowNumber,
        code: "VALIDATION_ERROR",
        message: row.validationErrors.join("; "),
      });
    } else if (existingHashes.has(row.rawRowHash)) {
      result.summary.willSkip++;
      result.rows.push({
        rowNumber: row.rowNumber,
        date: row.date,
        amount: row.amount,
        plotNumber: row.plotNumber,
        payer: row.payer,
        externalId: row.externalId,
        rawRowHash: row.rawRowHash,
        status: "will_skip",
      });
    } else {
      result.summary.willCreate++;
      result.rows.push({
        rowNumber: row.rowNumber,
        date: row.date,
        amount: row.amount,
        plotNumber: row.plotNumber,
        payer: row.payer,
        externalId: row.externalId,
        rawRowHash: row.rawRowHash,
        status: "will_create",
      });
    }
  }

  return result;
}
