"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function CsvImportForm({ existingKeys }: { existingKeys: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mode, setMode] = useState<"skip" | "upsert">("skip");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  const existingSet = useMemo(() => new Set(existingKeys), [existingKeys]);

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    const text = await file.text();
    const parsed = parseCsv(text);
    const [headerRow, ...dataRows] = parsed;
    if (!headerRow) {
      setError("Пустой файл");
      return;
    }
    const normalizedHeader = headerRow.map((h) => h.trim());
    if (headers.some((h) => !normalizedHeader.includes(h))) {
      setError("Отсутствуют обязательные заголовки CSV");
      return;
    }
    const mapped: ParsedRow[] = dataRows
      .filter((r) => r.length > 1)
      .map((cols) => {
        const row: ParsedRow = {};
        normalizedHeader.forEach((h, idx) => {
          const value = cols[idx]?.trim();
          if (value === undefined) return;
          if (h === "street") row.street = value;
          else if (h === "number") row.number = value;
          else if (h === "ownerFullName") row.ownerFullName = value || null;
          else if (h === "phone") row.phone = value || null;
          else if (h === "email") row.email = value || null;
          else if (h === "membershipStatus") row.membershipStatus = value.toUpperCase() || "UNKNOWN";
          else if (h === "isConfirmed") row.isConfirmed = value;
          else if (h === "notes") row.notes = value || null;
        });
        return row;
      });
    setRows(mapped);
    setRowErrors([]);
  };

  const counts = useMemo(() => {
    let duplicates = 0;
    let fresh = 0;
    const errorsLocal: string[] = [];
    rows.forEach((row, idx) => {
      if (!row.street || !row.number) return;
      const key = normalizeKey(row.street, row.number);
      if (existingSet.has(key)) duplicates += 1;
      else fresh += 1;
      if (row.membershipStatus && !["UNKNOWN", "MEMBER", "NON_MEMBER"].includes(row.membershipStatus)) {
        errorsLocal.push(`Строка ${idx + 2}: некорректный membershipStatus`);
      }
    });
    return { duplicates, fresh, errorsLocal };
  }, [rows, existingSet]);

  const handleImport = async () => {
    setError(null);
    setResult(null);
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
        setRowErrors(data.errors?.map((e: { rowIndex: number; message: string }) => `Строка ${e.rowIndex}: ${e.message}`) ?? []);
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
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-800">CSV файл</label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFile(file);
              e.target.value = "";
            }
          }}
          className="text-sm"
        />
        <p className="text-xs text-zinc-600">
          Формат: street, number, ownerFullName?, phone?, email?, membershipStatus (UNKNOWN|MEMBER|NON_MEMBER), isConfirmed (0/1)
        </p>
      </div>

      <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">
        Формат CSV: street, number, ownerFullName?, phone?, email?, membershipStatus (UNKNOWN|MEMBER|NON_MEMBER), isConfirmed (0/1), notes?.
        Разделитель — запятая. Кодировка UTF-8.
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
