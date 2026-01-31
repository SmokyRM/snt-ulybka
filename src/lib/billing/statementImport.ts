import { Buffer } from "buffer";
import { parseCsv } from "@/lib/billing/import-helpers";
import { parseXlsx } from "@/lib/excel";
import { listPlotEntries, resolvePlotIdByLabel, resolvePlotIdByPayer } from "@/lib/billing.store";
import { listRegistry } from "@/lib/registry.store";
import { normalizePhone } from "@/lib/utils/phone";

export type StatementRow = {
  rowIndex: number;
  date: string;
  amount: number;
  direction: "in" | "out";
  payerName: string;
  purpose: string;
  bankRef: string;
};

export type StatementTotals = {
  total: number;
  imported: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  duplicates: number;
  skippedOut: number;
};

export type StatementError = { rowIndex: number; message: string };

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

const parseNumber = (raw: string) => {
  const cleaned = raw.replace(/\s+/g, "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase();

const findHeaderIndex = (headers: string[], keys: string[]) => {
  for (let i = 0; i < headers.length; i++) {
    const value = headers[i];
    if (keys.some((key) => value.includes(key))) {
      return i;
    }
  }
  return -1;
};

const detectDirection = (value: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (["in", "credit", "приход", "зачис"].some((k) => normalized.includes(k))) return "in";
  if (["out", "debit", "расход", "спис"].some((k) => normalized.includes(k))) return "out";
  return null;
};

export async function parseStatementFile(input: { buffer: ArrayBuffer; filename: string | null }) {
  const name = input.filename ?? "";
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    return parseXlsx(new Uint8Array(input.buffer));
  }
  const text = Buffer.from(input.buffer).toString("utf-8").replace(/^\uFEFF/, "");
  return parseCsv(text);
}

export function normalizeStatementRows(rows: string[][]) {
  const errors: StatementError[] = [];
  if (rows.length < 2) {
    return { rows: [], errors: [{ rowIndex: 0, message: "Файл должен содержать заголовок и строки" }] };
  }

  const headers = rows[0].map((h) => normalizeHeader(h));
  const idxDate = findHeaderIndex(headers, ["date", "дата"]);
  const idxAmount = findHeaderIndex(headers, ["amount", "сумма"]);
  const idxPayer = findHeaderIndex(headers, ["payer", "платель", "контрагент", "отправитель", "получател", "name"]);
  const idxPurpose = findHeaderIndex(headers, ["purpose", "назнач", "описание", "comment", "details"]);
  const idxRef = findHeaderIndex(headers, ["ref", "operation", "transaction", "id", "номер"]);
  const idxDirection = findHeaderIndex(headers, ["direction", "type", "вид", "операция"]);
  const idxIn = findHeaderIndex(headers, ["credit", "приход", "зачис"]);
  const idxOut = findHeaderIndex(headers, ["debit", "расход", "спис"]);

  if (idxDate === -1 || (idxAmount === -1 && idxIn === -1 && idxOut === -1)) {
    return {
      rows: [],
      errors: [{ rowIndex: 0, message: "Не найдены обязательные колонки: дата/сумма" }],
    };
  }

  const result: StatementRow[] = [];

  rows.slice(1).forEach((row, index) => {
    const rowIndex = index + 2;
    const dateRaw = (row[idxDate] ?? "").trim();
    const dateValue = parseDate(dateRaw);

    const inAmountRaw = idxIn !== -1 ? (row[idxIn] ?? "") : "";
    const outAmountRaw = idxOut !== -1 ? (row[idxOut] ?? "") : "";
    const baseAmountRaw = idxAmount !== -1 ? (row[idxAmount] ?? "") : "";

    const inAmount = parseNumber(inAmountRaw) ?? 0;
    const outAmount = parseNumber(outAmountRaw) ?? 0;
    let amount = parseNumber(baseAmountRaw);

    if (amount === null && (inAmount || outAmount)) {
      amount = inAmount > 0 ? inAmount : -outAmount;
    }

    if (!dateValue) {
      errors.push({ rowIndex, message: "Неверная дата" });
      return;
    }

    if (amount === null) {
      errors.push({ rowIndex, message: "Неверная сумма" });
      return;
    }

    const directionValue = detectDirection(idxDirection !== -1 ? row[idxDirection] ?? "" : "") ?? (amount >= 0 ? "in" : "out");
    const normalizedAmount = Math.abs(amount);

    result.push({
      rowIndex,
      date: dateValue.toISOString(),
      amount: normalizedAmount,
      direction: directionValue,
      payerName: (row[idxPayer] ?? "").trim(),
      purpose: (row[idxPurpose] ?? "").trim(),
      bankRef: (row[idxRef] ?? "").trim(),
    });
  });

  return { rows: result, errors };
}

const extractPlotNumbers = (text: string) => {
  const found = new Set<string>();
  const patterns = [
    /(?:участок|уч\.?|уч|у)\s*[-#№]?\s*(\d{1,4})/gi,
    /[№#]\s*(\d{1,4})/gi,
    /\bУ-?(\d{1,4})\b/gi,
  ];
  patterns.forEach((pattern) => {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) found.add(match[1]);
    }
  });
  return Array.from(found);
};

export type MatchResult = {
  matchStatus: "matched" | "ambiguous" | "unmatched";
  matchedPlotId: string | null;
  matchCandidates: string[];
  matchReason: string | null;
  matchConfidence: number | null;
};

export function matchPaymentToPlot(input: { purpose: string; payerName: string }): MatchResult {
  const candidates = new Set<string>();
  const reasons = new Set<string>();
  const text = `${input.purpose ?? ""} ${input.payerName ?? ""}`.toLowerCase();

  const plotEntries = listPlotEntries();
  const registry = listRegistry();

  const numbers = extractPlotNumbers(text);
  numbers.forEach((num) => {
    const pattern = new RegExp(`\\b${num}\\b`);
    plotEntries.forEach((entry) => {
      if (pattern.test(entry.label)) {
        candidates.add(entry.plotId);
        reasons.add("plot_number");
      }
    });
  });

  if (input.payerName) {
    const payerLower = input.payerName.toLowerCase();
    registry.forEach((item) => {
      if (!item.ownerName) return;
      const owner = item.ownerName.toLowerCase();
      if (owner.includes(payerLower) || payerLower.includes(owner)) {
        const plotId = resolvePlotIdByLabel(item.plotNumber);
        if (plotId) {
          candidates.add(plotId);
          reasons.add("owner_name");
        }
      }
    });
  }

  const digits = text.replace(/\D/g, "");
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    registry.forEach((item) => {
      if (!item.phone) return;
      const phone = normalizePhone(item.phone);
      if (phone.endsWith(last4)) {
        const plotId = resolvePlotIdByLabel(item.plotNumber);
        if (plotId) {
          candidates.add(plotId);
          reasons.add("phone_last4");
        }
      }
    });
  }

  const list = Array.from(candidates);
  if (list.length === 1) {
    const reason = reasons.size === 1 ? Array.from(reasons)[0] : "mixed";
    return {
      matchStatus: "matched",
      matchedPlotId: list[0],
      matchCandidates: list,
      matchReason: reason,
      matchConfidence: reason === "plot_number" ? 0.9 : reason === "owner_name" ? 0.7 : 0.6,
    };
  }
  if (list.length > 1) {
    return {
      matchStatus: "ambiguous",
      matchedPlotId: null,
      matchCandidates: list,
      matchReason: "ambiguous",
      matchConfidence: 0.4,
    };
  }
  const byPayer = resolvePlotIdByPayer(input.payerName);
  if (byPayer) {
    return {
      matchStatus: "matched",
      matchedPlotId: byPayer,
      matchCandidates: [byPayer],
      matchReason: "payer_only",
      matchConfidence: 0.5,
    };
  }
  return {
    matchStatus: "unmatched",
    matchedPlotId: null,
    matchCandidates: [],
    matchReason: "unmatched",
    matchConfidence: null,
  };
}
