"use client";

import { useState } from "react";
import { ApiError, readOk } from "@/lib/api/client";

type ParsedRow = {
  plot_display: string;
  cadastral_number?: string | null;
  seed_owner_name?: string | null;
  seed_owner_phone?: string | null;
  note?: string | null;
};

const headers = ["plot_display", "cadastral_number", "seed_owner_name", "seed_owner_phone", "note"] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const pushValue = () => {
    current.push(value);
    value = "";
  };
  const pushRow = () => {
    if (current.length) rows.push(current);
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
      } else if (ch === ";" || ch === ",") {
        pushValue();
      } else if (ch === "\n") {
        pushValue();
        pushRow();
      } else if (ch === "\r") {
        // ignore
      } else {
        value += ch;
      }
    }
  }
  pushValue();
  pushRow();
  return rows;
}

function mapRows(raw: string[][]): ParsedRow[] {
  if (!raw.length) return [];
  const [headerRow, ...data] = raw;
  const mappedHeaders = headerRow.map((h) => h.trim().toLowerCase());
  const idx = (name: string) => mappedHeaders.indexOf(name);
  const displayIdx = idx("plot_display");
  if (displayIdx === -1) return [];
  return data
    .filter((r) => r.length > 0)
    .map((cols) => {
      const get = (name: string) => {
        const i = idx(name);
        if (i === -1) return "";
        return (cols[i] ?? "").toString().trim();
      };
      const row: ParsedRow = {
        plot_display: get("plot_display"),
      };
      const cad = get("cadastral_number");
      if (cad) row.cadastral_number = cad;
      const owner = get("seed_owner_name");
      if (owner) row.seed_owner_name = owner;
      const phone = get("seed_owner_phone");
      if (phone) row.seed_owner_phone = phone.replace(/\D+/g, "");
      const note = get("note");
      if (note) row.note = note;
      return row;
    })
    .filter((r) => r.plot_display);
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const ext = file.name.toLowerCase();
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length && (ext.endsWith(".xlsx") || ext.endsWith(".xls"))) {
    try {
      const { parseXlsx } = await import("@/lib/excel");
      const data = new Uint8Array(await file.arrayBuffer());
      const json = await parseXlsx(data);
      return mapRows(json);
    } catch {
      return [];
    }
  }
  return mapRows(rows);
}

export default function RegistryImportModalClient() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setErrors([]);
    const parsed = await parseFile(file);
    setRows(parsed.slice(0, 200));
    setLoading(false);
  };

  const onImport = async () => {
    if (!rows.length) return;
    if (!window.confirm("Импортировать реестр? Данные будут обновлены.")) {
      return;
    }
    setLoading(true);
    setErrors([]);
    setResult(null);
    try {
      const res = await fetch("/api/admin/registry/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await readOk<{ created?: number; updated?: number; skipped?: number }>(res);
      setResult(
        `Создано: ${data?.created ?? 0}, обновлено: ${data?.updated ?? 0}, пропущено: ${
          data?.skipped ?? 0
        }`
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const detailsErrors = (error.details as { errors?: string[] } | undefined)?.errors;
        setErrors(detailsErrors || [error.message || "Ошибка импорта"]);
        return;
      }
      setErrors(["Не удалось импортировать"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        id="registry-import-trigger"
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
      >
        Импорт
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl space-y-3 rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Импорт реестра</div>
                <p className="text-xs text-zinc-600">Загрузите CSV или XLSX с колонками шаблона.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Закрыть
              </button>
            </div>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            {loading && <div className="text-sm text-zinc-700">Загрузка...</div>}
            {rows.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-zinc-700">Предпросмотр (первые 20 строк)</div>
                <div className="max-h-64 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-xs">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        {headers.map((h) => (
                          <th key={h} className="px-2 py-1 text-left font-semibold text-zinc-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 20).map((r, idx) => (
                        <tr key={`${r.plot_display}-${idx}`} className="border-t border-zinc-200">
                          <td className="px-2 py-1">{r.plot_display}</td>
                          <td className="px-2 py-1">{r.cadastral_number || "—"}</td>
                          <td className="px-2 py-1">{r.seed_owner_name || "—"}</td>
                          <td className="px-2 py-1">{r.seed_owner_phone || "—"}</td>
                          <td className="px-2 py-1">{r.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {errors.length > 0 && (
              <div className="space-y-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {errors.slice(0, 20).map((e) => (
                  <div key={e}>{e}</div>
                ))}
              </div>
            )}
            {result && <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">{result}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onImport}
                disabled={!rows.length || loading}
                className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Импорт..." : "Импортировать"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRows([]);
                  setErrors([]);
                  setResult(null);
                }}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
              >
                Очистить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
