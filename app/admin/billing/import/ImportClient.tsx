"use client";

import { useEffect, useState } from "react";

export default function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    meta: {
      totalRows: number;
      okCount: number;
      errorCount: number;
      duplicateCount: number;
      truncated?: boolean;
      headers?: string[];
      warnings?: string[];
    };
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
      errors?: string[];
      isDuplicate?: boolean;
      category?: string | null;
      fingerprint?: string | null;
      matchedTargetFundId?: string | null;
      matchedTargetFundTitle?: string | null;
      warning?: string;
      suggestedTargetFundId?: string | null;
      suggestedTargetFundTitle?: string | null;
    }>;
  } | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    paidAt?: string;
    amount?: string;
    purpose?: string;
    street?: string;
    plotNumber?: string;
    reference?: string;
  }>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [importComment, setImportComment] = useState("");
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    createdCount: number;
    skippedCount: number;
    skipped: Array<{ rowIndex: number; reason: string }>;
  } | null>(null);
  const [targets, setTargets] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [selectedTargetByRow, setSelectedTargetByRow] = useState<Record<number, string | null>>({});

  const reset = () => {
    setFile(null);
    setResult(null);
    setHeaders([]);
    setMapping({});
    setSelected([]);
    setImportComment("");
    setCommitResult(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    reset();
    setFile(f);
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCommitResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (mapping && Object.keys(mapping).length > 0) {
        formData.append("mapping", JSON.stringify(mapping));
      }
      const res = await fetch("/api/admin/billing/import/preview", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "Ошибка загрузки");
        return;
      }
      const data = await res.json();
      setResult(data);
      if (data?.meta?.headers) {
        setHeaders(data.meta.headers as string[]);
      }
      if (data?.rows) {
        const okRows = (data.rows as Array<{ rowIndex: number; status: string }>).filter(
          (r) => r.status === "OK"
        );
        setSelected(okRows.map((r) => r.rowIndex));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!result) return;
    const rowsToSend =
      result.rows
        ?.filter((r) => selected.includes(r.rowIndex) && r.status === "OK")
        .map((r) => ({
          rowIndex: r.rowIndex,
          paidAtIso: r.paidAtIso,
          amount: r.amount,
          purpose: r.purpose,
          plotIdMatched: r.plotIdMatched,
          reference: r.reference,
          category: r.category ?? null,
          targetFundId:
            selectedTargetByRow[r.rowIndex] ??
            (r.category === "target_fee" ? r.suggestedTargetFundId ?? r.matchedTargetFundId ?? null : null),
        })) ?? [];
    if (!rowsToSend.length) return;
    setCommitLoading(true);
    setError(null);
    setCommitResult(null);
    try {
      const res = await fetch("/api/admin/billing/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsToSend, importComment, fileName: file?.name ?? null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка импорта");
        return;
      }
      setCommitResult(
        data as { createdCount: number; skippedCount: number; skipped: Array<{ rowIndex: number; reason: string }> }
      );
      setResult((prev) =>
        prev
          ? {
              ...prev,
              rows: prev.rows.map((row) =>
                selected.includes(row.rowIndex)
                  ? { ...row, status: "DUPLICATE", error: "Импортировано" }
                  : row
              ),
            }
          : prev
      );
      setSelected([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCommitLoading(false);
    }
  };

  const toggleRow = (rowIndex: number) => {
    setSelected((prev) => (prev.includes(rowIndex) ? prev.filter((r) => r !== rowIndex) : [...prev, rowIndex]));
  };

  const selectAllOk = () => {
    if (!result?.rows) return;
    setSelected(result.rows.filter((r) => r.status === "OK").map((r) => r.rowIndex));
  };

  const deselectAll = () => setSelected([]);

  const okCount = result?.rows?.filter((r) => r.status === "OK").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handlePreview}
              disabled={!file || loading}
            >
              Проверить
            </button>
            <button
              type="button"
              className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={reset}
            >
              Очистить
            </button>
          </div>
        </div>
        {headers.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="text-sm font-semibold text-zinc-800">Сопоставление колонок</div>
            <div className="space-y-2 sm:col-span-2">
              {["Дата", "Сумма", "Назначение", "Улица", "Участок", "Номер операции"].map((label) => {
                const keyMap: Record<string, keyof typeof mapping> = {
                  Дата: "paidAt",
                  Сумма: "amount",
                  Назначение: "purpose",
                  Улица: "street",
                  Участок: "plotNumber",
                  "Номер операции": "reference",
                };
                const key = keyMap[label];
                return (
                  <label key={label} className="flex items-center gap-2 text-sm text-zinc-700">
                    <span className="min-w-[140px]">{label}</span>
                    <select
                      value={mapping[key] ?? ""}
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [key]: e.target.value || undefined,
                        }))
                      }
                      className="flex-1 rounded border border-zinc-300 px-2 py-1"
                    >
                      <option value="">Авто</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100"
                onClick={() => setMapping({})}
              >
                Сбросить сопоставление
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-700">
            <span>Всего: {result.meta.totalRows}</span>
            <span className="text-green-700">OK: {result.meta.okCount}</span>
            <span className="text-amber-700">Дубликаты: {result.meta.duplicateCount}</span>
            <span className="text-red-700">Ошибки: {result.meta.errorCount}</span>
            {result.meta.truncated && <span className="text-zinc-500">Показаны первые 200 строк</span>}
            {result.meta.warnings?.length ? (
              <span className="text-amber-700">
                Предупреждения: {result.meta.warnings.join(", ")}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={selectAllOk}
                className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!okCount}
              >
                Выбрать все OK
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-100"
              >
                Снять выбор
              </button>
              <span>Выбрано: {selected.length}</span>
              <input
                type="text"
                placeholder="Комментарий к импорту"
                value={importComment}
                onChange={(e) => setImportComment(e.target.value)}
                className="min-w-[240px] flex-1 rounded border border-zinc-300 px-2 py-1"
              />
              <button
                type="button"
                disabled={!selected.length || commitLoading}
                onClick={handleCommit}
                className="rounded bg-[#5E704F] px-3 py-1 text-sm font-semibold text-white hover:bg-[#4f5f42] disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {commitLoading ? "Импортируем..." : "Импортировать выбранные"}
              </button>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-xs sm:text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                        checked={selected.length > 0 && selected.length === okCount}
                        onChange={(e) => (e.target.checked ? selectAllOk() : setSelected([]))}
                      />
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Статус</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Дата</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Категория</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Цель</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Улица/Участок</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Участок найден</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Reference</th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-700">Ошибка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {result.rows.map((row) => {
                    const selectable = row.status === "OK";
                    const isSelected = selected.includes(row.rowIndex);
                    const statusColor =
                      row.status === "OK"
                        ? "text-green-700"
                        : row.status === "DUPLICATE"
                          ? "text-amber-700"
                          : "text-red-700";
                    return (
                      <tr key={row.rowIndex} className="align-middle">
                        <td className="px-2 py-1">
                          {selectable && (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                              checked={isSelected}
                              onChange={() => toggleRow(row.rowIndex)}
                            />
                          )}
                        </td>
                        <td className={`px-2 py-1 font-semibold ${statusColor}`}>
                          {row.status}
                          {row.isDuplicate ? " (dup)" : ""}
                        </td>
                        <td className="px-2 py-1">{row.paidAtLocalFormatted ?? "—"}</td>
                        <td className="px-2 py-1">{row.amount ?? "—"}</td>
                        <td className="px-2 py-1">{row.category ?? "—"}</td>
                        <td className="px-2 py-1">
                          {row.suggestedTargetFundId ? (
                            <div className="text-xs text-zinc-800">
                              {row.suggestedTargetFundTitle ?? row.matchedTargetFundTitle ?? "Цель найдена"}
                            </div>
                          ) : (
                            <select
                              className="rounded border border-zinc-300 px-2 py-1 text-xs"
                              value={selectedTargetByRow[row.rowIndex] ?? ""}
                              onChange={(e) =>
                                setSelectedTargetByRow((prev) => ({
                                  ...prev,
                                  [row.rowIndex]: e.target.value || null,
                                }))
                              }
                            >
                              <option value="">Не выбрано</option>
                              {targets.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.title}
                                </option>
                              ))}
                            </select>
                          )}
                          {row.warning === "target_fund_missing" ? (
                            <div className="text-xs text-amber-700">Цель не определена</div>
                          ) : null}
                        </td>
                        <td className="px-2 py-1">
                          {row.matchedTargetFundTitle ?? "—"}
                          {row.warning ? <div className="text-xs text-amber-700">{row.warning}</div> : null}
                        </td>
                        <td className="px-2 py-1">
                          {row.streetRaw} / {row.plotNumberRaw}{" "}
                          {row.streetParsed || row.plotNumberParsed ? (
                            <span className="text-zinc-500">
                              ({row.streetParsed ?? "?"} / {row.plotNumberParsed ?? "?"})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1">{row.plotIdMatched ?? "—"}</td>
                        <td className="px-2 py-1">{row.reference ?? "—"}</td>
                        <td className="px-2 py-1">
                          {row.errors?.length ? row.errors.join(", ") : row.error ?? ""}
                        </td>
                      </tr>
                    );
                  })}
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
        </div>
      )}

      {commitResult && (
        <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
          <div>Создано платежей: {commitResult.createdCount}</div>
          <div>Пропущено: {commitResult.skippedCount}</div>
          {commitResult.skipped.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="font-semibold">Пропущенные строки:</div>
              {commitResult.skipped.map((s) => (
                <div key={s.rowIndex}>
                  Строка {s.rowIndex}: {s.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <div className="text-sm text-zinc-600">Обрабатываем файл...</div>}
    </div>
  );
}
