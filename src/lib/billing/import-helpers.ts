export type ImportTotals = { total: number; valid: number; invalid: number };
export type ImportRowError = { rowIndex: number; message: string };

const normalize = (value: string | null | undefined) => (value ?? "").trim();

export const parseCsv = (content: string): string[][] => {
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

const parseDate = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(match[0]);
  const matchRu = trimmed.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (matchRu) return new Date(`${matchRu[3]}-${matchRu[2]}-${matchRu[1]}`);
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function analyzeImportRows(rows: string[][]): { totals: ImportTotals; errors: ImportRowError[] } {
  if (rows.length < 2) {
    return {
      totals: { total: 0, valid: 0, invalid: 0 },
      errors: [{ rowIndex: 0, message: "CSV должен содержать заголовок и строки данных" }],
    };
  }

  const headerRow = rows[0].map((h) => h.toLowerCase().trim());
  const idxDate = findHeaderIndex(headerRow, ["date", "дата"]);
  const idxAmount = findHeaderIndex(headerRow, ["amount", "сумма"]);
  const idxPlot = findHeaderIndex(headerRow, ["plot", "участок"]);
  const idxPayer = findHeaderIndex(headerRow, ["payer", "платель", "фио", "owner", "name"]);

  if (idxDate === -1 || idxAmount === -1 || idxPlot === -1 || idxPayer === -1) {
    return {
      totals: { total: rows.length - 1, valid: 0, invalid: rows.length - 1 },
      errors: [{ rowIndex: 0, message: "Нужны колонки: date, amount, plot, payer" }],
    };
  }

  const errors: ImportRowError[] = [];
  let valid = 0;
  let invalid = 0;

  rows.slice(1).forEach((row, index) => {
    const rowIndex = index + 2;
    const dateRaw = normalize(row[idxDate]);
    const amountRaw = normalize(row[idxAmount]);
    const plotRaw = normalize(row[idxPlot]);
    const payerRaw = normalize(row[idxPayer]);

    const rowErrors: string[] = [];
    const parsedDate = parseDate(dateRaw);
    if (!parsedDate) rowErrors.push("Неверная дата");
    const amount = Number(amountRaw.replace(/\s+/g, "").replace(",", "."));
    if (!Number.isFinite(amount)) rowErrors.push("Неверная сумма");
    if (!plotRaw) rowErrors.push("Участок обязателен");
    if (!payerRaw) rowErrors.push("Плательщик обязателен");

    if (rowErrors.length) {
      invalid += 1;
      errors.push({ rowIndex, message: rowErrors.join("; ") });
    } else {
      valid += 1;
    }
  });

  return {
    totals: { total: rows.length - 1, valid, invalid },
    errors,
  };
}

export function extractPeriodsFromRows(rows: string[][]): string[] {
  if (rows.length < 2) return [];
  const headerRow = rows[0].map((h) => h.toLowerCase().trim());
  const idxDate = headerRow.findIndex((value) => ["date", "дата"].some((key) => value.includes(key)));
  if (idxDate === -1) return [];
  const periods = new Set<string>();
  rows.slice(1).forEach((row) => {
    const raw = normalize(row[idxDate]);
    const parsed = parseDate(raw);
    if (parsed) {
      const period = parsed.toISOString().slice(0, 7);
      periods.add(period);
    }
  });
  return Array.from(periods);
}
