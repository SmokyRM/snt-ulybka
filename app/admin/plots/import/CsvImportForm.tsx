"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeRow } from "@/lib/plotsImport/normalizeRow";

type ParsedRow = {
  street?: string;
  number?: string;
  ownerFullName?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus?: string;
  isConfirmed?: string | boolean | number | null;
  notes?: string | null;
};

const normalizeKey = (street: string, number: string) =>
  `${street.trim().toLowerCase()}|${number.trim().toLowerCase()}`;

const headers = [
  "street",
  "number",
  "ownerFullName",
  "phone",
  "email",
  "membershipStatus",
  "isConfirmed",
  "notes",
] as const;

const headerAliases: Record<string, string> = {
  улица: "street",
  "номер участка": "number",
  участок: "number",
  фио: "ownerFullName",
  "фамилия имя отчество": "ownerFullName",
  телефон: "phone",
  почта: "email",
  email: "email",
  статус: "membershipStatus",
  членство: "membershipStatus",
  подтвержден: "isConfirmed",
  подтверждён: "isConfirmed",
  примечание: "notes",
  комментарий: "notes",
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const flushValue = () => {
    current.push(value);
    value = "";
  };
  const flushRow = () => {
    rows.push(current);
    current = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
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
      } else if (ch === ",") {
        flushValue();
      } else if (ch === "\n") {
        flushValue();
        flushRow();
      } else if (ch === "\r") {
        // ignore
      } else {
        value += ch;
      }
    }
  }
  flushValue();
  flushRow();
  return rows;
};

const parseTsv = (text: string) => {
  return text
    .split("\n")
    .map((line) => line.replace(/\r/g, "").split("\t"))
    .filter((row) => row.length > 1);
};

const mapHeadersLocal = (raw: string[]) =>
  raw.map((h) => {
    const low = h.trim().toLowerCase();
    return headerAliases[low] ?? low;
  });

type XLSXType = {
  read: (data: ArrayBuffer, opts: { type: string }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
  utils: { sheet_to_json: (sheet: unknown, opts: { header: number }) => unknown[] };
};

async function parseXlsx(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  try {
    const XLSX: XLSXType = await import(
      // @ts-expect-error External ESM import from CDN at runtime (types unavailable)
      /* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm"
    );
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
    return json;
  } catch (e) {
    console.error("XLSX import failed", e);
    return [];
  }
}

export default function CsvImportForm({ existingKeys }: { existingKeys: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mode, setMode] = useState<"skip" | "upsert">("skip");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [tab, setTab] = useState<"csv" | "xlsx" | "paste">("csv");

  const existingSet = useMemo(() => new Set(existingKeys), [existingKeys]);

  const normalizeRows = (parsed: string[][]) => {
    const [headerRow, ...dataRows] = parsed;
    if (!headerRow) {
      setError("Пустой файл или данные");
      return;
    }
    const mappedHeaders = mapHeadersLocal(headerRow);
    const streetIdx = mappedHeaders.indexOf("street");
    const numberIdx = mappedHeaders.indexOf("number");
    if (streetIdx === -1 || numberIdx === -1) {
      setError("Не найдены обязательные заголовки: улица, участок");
      return;
    }
    const mapped: ParsedRow[] = dataRows
      .filter((r) => r.length > 1)
      .map((cols) => {
        const row: ParsedRow = {};
        const getVal = (name: string) => {
          const idx = mappedHeaders.indexOf(name);
          if (idx === -1) return undefined;
          return cols[idx];
        };
        const street = getVal("street");
        const number = getVal("number");
        const ownerFullName = getVal("ownerFullName");
        const phone = getVal("phone");
        const email = getVal("email");
        const membershipStatus = getVal("membershipStatus");
        const isConfirmed = getVal("isConfirmed");
        const notes = getVal("notes");

        if (street !== undefined) row.street = street?.toString().trim();
        if (number !== undefined) row.number = number?.toString().trim();
        if (ownerFullName !== undefined) row.ownerFullName = ownerFullName?.toString().trim() || null;
        if (phone !== undefined) row.phone = phone?.toString().trim() || null;
        if (email !== undefined) row.email = email?.toString().trim() || null;
        if (membershipStatus !== undefined)
          row.membershipStatus = membershipStatus?.toString().trim().toUpperCase();
        if (isConfirmed !== undefined) row.isConfirmed = isConfirmed?.toString().trim();
        if (notes !== undefined) row.notes = notes?.toString().trim() || null;

        return row;
      });
    setRows(mapped);
    setRowErrors([]);
  };

  const handleCsvFile = async (file: File) => {
    setError(null);
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    normalizeRows(parsed);
  };

  const handleXlsxFile = async (file: File) => {
    setError(null);
    setResult(null);
    const parsed = await parseXlsx(file);
    if (!parsed.length) {
      setError("Не удалось прочитать XLSX");
      return;
    }
    normalizeRows(parsed as string[][]);
  };

  const handlePaste = (text: string) => {
    setError(null);
    setResult(null);
    if (!text.trim()) {
      setRows([]);
      return;
    }
    const parsed = parseTsv(text);
    normalizeRows(parsed);
  };

  const counts = useMemo(() => {
    const errorsLocal: string[] = [];
    let duplicates = 0;
    let fresh = 0;
    rows.forEach((row, idx) => {
      const { normalized, errors } = normalizeRow(row);
      if (errors.length) {
        errorsLocal.push(`Строка ${idx + 2}: ${errors.join(" ")}`);
        return;
      }
      const key = normalizeKey(normalized.street, normalized.number);
      if (existingSet.has(key)) duplicates += 1;
      else fresh += 1;
      if (
        normalized.membershipStatus &&
        !["UNKNOWN", "MEMBER", "NON_MEMBER"].includes(normalized.membershipStatus)
      ) {
        errorsLocal.push(`Строка ${idx + 2}: некорректный membershipStatus`);
      }
    });
    return { duplicates, fresh, errorsLocal };
  }, [rows, existingSet]);

  const handleImport = async () => {
    setError(null);
    setResult(null);
    setRowErrors([]);
    if (!rows.length) {
      setError("Нет данных для импорта");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/plots/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось импортировать");
        setRowErrors(
          data.errors?.map((e: { rowIndex: number; message: string }) => `Строка ${e.rowIndex}: ${e.message}`) ??
            []
        );
        return;
      }
      setResult(
        `Создано: ${data.created ?? 0}, обновлено: ${data.updated ?? 0}, пропущено: ${
          data.skipped ?? 0
        }`
      );
      setRowErrors(
        data.errors?.map((e: { rowIndex: number; message: string }) => `Строка ${e.rowIndex}: ${e.message}`) ??
          []
      );
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const preview = rows.slice(0, 20);
  const errorsToShow = [...rowErrors, ...counts.errorsLocal].slice(0, 10);
  const validRows = rows.length - counts.errorsLocal.length;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-[#2F3827]">
        <button
          type="button"
          onClick={() => setTab("csv")}
          className={`rounded-full px-4 py-2 ${
            tab === "csv" ? "bg-[#5E704F] text-white" : "bg-white text-[#2F3827]"
          } border border-zinc-200`}
        >
          CSV файл
        </button>
        <button
          type="button"
          onClick={() => setTab("xlsx")}
          className={`rounded-full px-4 py-2 ${
            tab === "xlsx" ? "bg-[#5E704F] text-white" : "bg-white text-[#2F3827]"
          } border border-zinc-200`}
        >
          Excel (.xlsx)
        </button>
        <button
          type="button"
          onClick={() => setTab("paste")}
          className={`rounded-full px-4 py-2 ${
            tab === "paste" ? "bg-[#5E704F] text-white" : "bg-white text-[#2F3827]"
          } border border-zinc-200`}
        >
          Вставить из таблицы
        </button>
      </div>

      {tab === "csv" && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">CSV файл</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleCsvFile(file);
                e.target.value = "";
              }
            }}
            className="text-sm"
          />
        </div>
      )}

      {tab === "xlsx" && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">XLSX файл</label>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleXlsxFile(file);
                e.target.value = "";
              }
            }}
            className="text-sm"
          />
          <p className="text-xs text-zinc-600">
            Будет прочитан первый лист. Поддерживаются английские и русские заголовки.
          </p>
        </div>
      )}

      {tab === "paste" && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-800">Вставьте строки (TSV)</label>
          <textarea
            rows={8}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="street\tnumber\townerFullName\tphone\temail\tmembershipStatus\tisConfirmed\tnotes"
            onChange={(e) => handlePaste(e.target.value)}
          />
          <p className="text-xs text-zinc-600">Вставьте данные из Google Sheets/Excel (таб разделитель).</p>
        </div>
      )}

      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">
        Формат: street, number, ownerFullName?, phone?, email?, membershipStatus (UNKNOWN|MEMBER|NON_MEMBER), isConfirmed (0/1/true/false), notes?. Поддерживаются русские заголовки-синонимы.
      </div>

      <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#2F3827]">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="skip"
            checked={mode === "skip"}
            onChange={() => setMode("skip")}
          />
          Пропускать дубликаты
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="mode"
            value="upsert"
            checked={mode === "upsert"}
            onChange={() => setMode("upsert")}
          />
          Обновлять существующие
        </label>
      </div>

      <div className="text-sm text-zinc-700">
        Всего строк: <span className="font-semibold">{rows.length}</span> · Валидных (по базовой
        проверке): <span className="font-semibold">{validRows}</span> · Дубликатов существующих:{" "}
        <span className="font-semibold">{counts.duplicates}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={loading || rows.length === 0}
          className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Импортируем..." : "Импортировать"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {result}
        </div>
      )}
      {errorsToShow.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Ошибки (первые {errorsToShow.length}):
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {errorsToShow.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-zinc-800">Превью (первые 20)</p>
          <div className="overflow-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-t border-zinc-100">
                    {headers.map((h) => (
                      <td key={h} className="px-3 py-2 text-xs text-zinc-700">
                        {String((row as Record<string, unknown>)[h] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
