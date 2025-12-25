import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { useState } from "react";

export default async function BillingImportPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Импорт платежей (preview)</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <ImportClient />
      </div>
    </main>
  );
}

function ImportClient() {
  "use client";

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    meta: { totalRows: number; okCount: number; errorCount: number; duplicateCount: number; truncated?: boolean };
    rows: Array<{
      rowIndex: number;
      paidAtIso: string | null;
      paidAtLocalFormatted: string | null;
      amount: number | null;
      purpose: string;
      streetRaw: string;
      plotNumberRaw: string;
      streetParsed: string | null;
      plotNumberParsed: string | null;
      plotIdMatched: string | null;
      reference: string | null;
      status: "OK" | "ERROR" | "DUPLICATE";
      error?: string;
    }>;
  } | null>(null);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/billing/import/preview", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Недостаточно прав. Обновите сессию.");
        } else {
          const txt = await res.text();
          setError(`Ошибка запроса: ${txt || res.statusText}`);
        }
        return;
      }
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const statusColor = (status: string) => {
    if (status === "OK") return "text-green-700";
    if (status === "DUPLICATE") return "text-amber-700";
    return "text-red-700";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-zinc-700">
            CSV формата Excel/Google, разделитель &quot;;&quot; (UTF-8 + BOM). Максимум 200 строк в превью.
          </div>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-zinc-600 underline"
          >
            Очистить
          </button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
            }}
            className="text-sm"
          />
          <button
            type="button"
            disabled={!file || loading}
            onClick={upload}
            className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {loading ? "Проверяем..." : "Проверить"}
          </button>
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm text-sm text-zinc-800">
            <div className="flex flex-wrap gap-4">
              <span>Всего строк: {result.meta.totalRows}</span>
              <span className="text-green-700">OK: {result.meta.okCount}</span>
              <span className="text-red-700">Ошибок: {result.meta.errorCount}</span>
              <span className="text-amber-700">Дубликаты: {result.meta.duplicateCount}</span>
              {result.meta.truncated && <span className="text-amber-700">Показаны только первые 200</span>}
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-xs sm:text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Статус</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Дата</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Улица/участок</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Парсинг</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Plot ID</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Reference</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Ошибка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
    {result.rows.map((r: (typeof result.rows)[number]) => (
                  <tr key={r.rowIndex} className={r.status !== "OK" ? "bg-red-50/40" : ""}>
                    <td className={`px-2 py-2 font-semibold ${statusColor(r.status)}`}>{r.status}</td>
                    <td className="px-2 py-2 text-zinc-800">{r.paidAtLocalFormatted ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-800">{r.amount ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-700">
                      {r.streetRaw} {r.plotNumberRaw}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">
                      {r.streetParsed ?? "—"} {r.plotNumberParsed ?? ""}
                    </td>
                    <td className="px-2 py-2 text-zinc-700">{r.plotIdMatched ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-700">{r.reference ?? "—"}</td>
                    <td className="px-2 py-2 text-zinc-700">
                      {r.error ? r.error : r.status === "DUPLICATE" ? "Дубликат" : "—"}
                    </td>
                  </tr>
                ))}
                {result.rows.length === 0 && (
                  <tr>
                    <td className="px-2 py-3 text-center text-zinc-600" colSpan={8}>
                      Нет данных
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
