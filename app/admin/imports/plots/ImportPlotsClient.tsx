"use client";

import { useState } from "react";

type PreviewRow = {
  rowIndex: number;
  cadastral?: string;
  plotNumber?: string;
  street?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  membershipStatus: "member" | "not_member" | "unknown";
  confirmed: boolean;
};

type PreviewResponse = {
  ok: boolean;
  summary: { total: number; valid: number; invalid: number };
  previewRows: PreviewRow[];
  errors: { rowIndex: number; messages: string[] }[];
};

export default function ImportPlotsClient() {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<PreviewResponse["summary"] | null>(null);
  const [errors, setErrors] = useState<PreviewResponse["errors"]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ created: number; updated: number } | null>(
    null
  );

  const onFile = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    setErrorMessage(null);
    setRows([]);
    setSummary(null);
    setErrors([]);
    setApplyResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/imports/plots/preview", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as PreviewResponse;
      if (!res.ok || !data.ok) {
        setErrorMessage("Не удалось разобрать файл");
        return;
      }
      setRows(data.previewRows);
      setSummary(data.summary);
      setErrors(data.errors);
    } catch {
      setErrorMessage("Не удалось прочитать файл");
    } finally {
      setLoading(false);
    }
  };

  const canApply =
    Boolean(summary) && summary.invalid === 0 && rows.length > 0 && !applying;
  const errorMap = new Map(errors.map((item) => [item.rowIndex, item.messages]));

  const onApply = async () => {
    if (!canApply) return;
    setApplying(true);
    setErrorMessage(null);
    setApplyResult(null);
    try {
      const res = await fetch("/api/admin/imports/plots/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json()) as { ok?: boolean; created?: number; updated?: number };
      if (!res.ok || !data.ok) {
        setErrorMessage("Не удалось импортировать данные");
        return;
      }
      setApplyResult({ created: data.created ?? 0, updated: data.updated ?? 0 });
    } catch {
      setErrorMessage("Не удалось импортировать данные");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800">
            Загрузить CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
          {loading ? <span className="text-sm text-zinc-600">Загрузка...</span> : null}
          {errorMessage ? (
            <span className="text-sm text-rose-700">{errorMessage}</span>
          ) : null}
          {applyResult ? (
            <span className="text-sm text-emerald-700">
              Создано: {applyResult.created}, обновлено: {applyResult.updated}
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Сводка</h2>
        {summary ? (
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-700">
            <div>Всего строк: {summary.total}</div>
            <div>Валидных: {summary.valid}</div>
            <div>Ошибок: {summary.invalid}</div>
          </div>
        ) : (
          <div className="mt-3 text-sm text-zinc-500">Файл ещё не загружен.</div>
        )}
      </div>

      {errors.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
          <div className="font-semibold">Ошибки (первые 20)</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {errors.slice(0, 20).map((err) => (
              <li key={`${err.rowIndex}-${err.messages.join("-")}`}>
                Строка {err.rowIndex}: {err.messages.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {applying ? "Импортирование..." : "Импортировать"}
        </button>
        {summary && summary.invalid > 0 ? (
          <span className="text-sm text-rose-700">Исправьте ошибки перед импортом</span>
        ) : null}
        <a
          href="/admin/plots"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Открыть реестр участков
        </a>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Предпросмотр (первые 50 строк)</h2>
        {rows.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-500">Нет данных для предпросмотра.</div>
        ) : (
          <div className="mt-4 overflow-auto rounded-xl border border-zinc-200">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Участок</th>
                  <th className="px-3 py-2">Кадастровый</th>
                  <th className="px-3 py-2">Улица</th>
                  <th className="px-3 py-2">Собственник</th>
                  <th className="px-3 py-2">Телефон</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Членство</th>
                  <th className="px-3 py-2">Подтв.</th>
                  <th className="px-3 py-2">Ошибки</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowIndex} className="border-t border-zinc-200">
                    <td className="px-3 py-2">{row.plotNumber || "—"}</td>
                    <td className="px-3 py-2">{row.cadastral || "—"}</td>
                    <td className="px-3 py-2">{row.street || "—"}</td>
                    <td className="px-3 py-2">{row.ownerName || "—"}</td>
                    <td className="px-3 py-2">{row.phone || "—"}</td>
                    <td className="px-3 py-2">{row.email || "—"}</td>
                    <td className="px-3 py-2">{row.membershipStatus}</td>
                    <td className="px-3 py-2">{row.confirmed ? "Да" : "Нет"}</td>
                    <td className="px-3 py-2 text-xs text-rose-700">
                      {errorMap.get(row.rowIndex)?.join("; ") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
