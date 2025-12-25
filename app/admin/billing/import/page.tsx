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
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm space-y-2">
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/admin/billing/import/template.csv"
              className="rounded-full border border-[#5E704F] px-3 py-1 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Скачать шаблон CSV
            </a>
            <div className="text-sm text-zinc-700">
              Как подготовить: разделитель ;, UTF-8, колонки: Дата, Сумма, Назначение, Улица, Участок, Номер операции.
              Пример назначения: &quot;ул. Березовая уч.12 за ноябрь 2025&quot;.
            </div>
          </div>
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
  const [selected, setSelected] = useState<number[]>([]);
  const [importComment, setImportComment] = useState("");
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    createdCount: number;
    skippedCount: number;
    created: Array<{ paymentId: string; plotId: string; periodId: string; amount: number; paidAtIso: string; reference: string | null }>;
    skipped: Array<{ rowIndex: number; reason: string }>;
  } | null>(null);

  const upload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSelected([]);
    setCommitResult(null);
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
    setSelected([]);
    setCommitResult(null);
    setImportComment("");
  };

  const statusColor = (status: string) => {
    if (status === "OK") return "text-green-700";
    if (status === "DUPLICATE") return "text-amber-700";
    return "text-red-700";
  };

  const toggleRow = (rowIndex: number) => {
    setSelected((prev) => (prev.includes(rowIndex) ? prev.filter((r) => r !== rowIndex) : [...prev, rowIndex]));
  };

  const selectAllOk = () => {
    if (!result) return;
    const allOk = result.rows.filter((r) => r.status === "OK").map((r) => r.rowIndex);
    setSelected(allOk);
  };

  const deselectAll = () => setSelected([]);

  const importSelected = async () => {
    if (!result || !selected.length) return;
    setCommitLoading(true);
    setError(null);
    setCommitResult(null);
    const rows = result.rows
      .filter((r) => selected.includes(r.rowIndex))
      .map((r) => ({
        rowIndex: r.rowIndex,
        paidAtIso: r.paidAtIso,
        amount: r.amount,
        purpose: r.purpose,
        plotIdMatched: r.plotIdMatched,
        reference: r.reference,
      }));
    try {
      const res = await fetch("/api/admin/billing/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, importComment }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(`Ошибка импорта: ${txt || res.statusText}`);
        return;
      }
      const json = await res.json();
      setCommitResult(json);
      // помечаем импортированные как DUPLICATE визуально
      const importedIndices = new Set<number>(rows.map((r) => r.rowIndex));
      setResult({
        ...result,
        rows: result.rows.map((r) =>
          importedIndices.has(r.rowIndex) ? { ...r, status: "DUPLICATE" as const, error: "Импортировано" } : r
        ),
      });
      setSelected([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCommitLoading(false);
    }
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
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                Комментарий к импорту:
                <input
                  type="text"
                  value={importComment}
                  onChange={(e) => setImportComment(e.target.value)}
                  className="w-64 rounded border border-zinc-300 px-2 py-1"
                  placeholder="необязательно"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  onClick={selectAllOk}
                >
                  Выбрать все OK
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100"
                  onClick={deselectAll}
                >
                  Снять выбор
                </button>
                <button
                  type="button"
                  disabled={!selected.length || commitLoading}
                  onClick={importSelected}
                  className="rounded bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {commitLoading ? "Импортируем..." : `Импортировать выбранные (${selected.length})`}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-xs sm:text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                      onChange={(e) => (e.target.checked ? selectAllOk() : deselectAll())}
                      checked={
                        result.rows.filter((r) => r.status === "OK").every((r) => selected.includes(r.rowIndex)) &&
                        result.rows.some((r) => r.status === "OK")
                      }
                    />
                  </th>
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
                    <td className="px-2 py-2">
                      {r.status === "OK" && (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                          checked={selected.includes(r.rowIndex)}
                          onChange={() => toggleRow(r.rowIndex)}
                        />
                      )}
                    </td>
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

      {commitResult && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm text-sm text-zinc-800 space-y-3">
          <div className="font-semibold text-zinc-900">Результат импорта</div>
          <div className="flex flex-wrap gap-4">
            <span className="text-green-700">Создано: {commitResult.createdCount}</span>
            <span className="text-amber-700">Пропущено: {commitResult.skippedCount}</span>
          </div>
          {commitResult.created.length > 0 && (
            <div>
              <div className="font-semibold text-zinc-900">Созданные платежи</div>
              <ul className="list-disc pl-5 text-sm text-zinc-700">
                {commitResult.created.slice(0, 10).map((c) => (
                  <li key={c.paymentId}>
                    {c.paymentId}: {c.amount} ₽, plot {c.plotId}, дата {c.paidAtIso}
                  </li>
                ))}
                {commitResult.created.length > 10 && (
                  <li className="text-zinc-600">и ещё {commitResult.created.length - 10}...</li>
                )}
              </ul>
            </div>
          )}
          {commitResult.skipped.length > 0 && (
            <div>
              <div className="font-semibold text-zinc-900">Пропущенные строки</div>
              <ul className="list-disc pl-5 text-sm text-zinc-700">
                {commitResult.skipped.map((s, idx) => (
                  <li key={`${s.rowIndex}-${idx}`}>
                    Строка {s.rowIndex}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
