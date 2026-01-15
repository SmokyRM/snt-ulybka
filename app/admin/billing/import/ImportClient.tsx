"use client";

import { useEffect, useState } from "react";

type PreviewMeta = {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  unmatchedCount: number;
  duplicates: number;
  warnings?: string[];
  truncated?: boolean;
  detectedDelimiter?: string;
  detectedEncoding?: string;
  headers?: string[];
};

type PreviewRow = {
  rowIndex: number;
  status: "OK" | "ERROR" | "DUPLICATE";
  paidAtIso: string | null;
  paidAtLocalFormatted: string | null;
  amount: number | null;
  purpose?: string | null;
  streetRaw: string;
  plotNumberRaw: string;
  streetParsed?: string | null;
  plotNumberParsed?: string | null;
  plotIdMatched?: string | null;
  reference?: string | null;
  category?: string | null;
  fingerprint?: string | null;
  matchedTargetFundId?: string | null;
  matchedTargetFundTitle?: string | null;
  suggestedTargetFundId?: string | null;
  suggestedTargetFundTitle?: string | null;
  error?: string;
  errors?: string[];
  warning?: string;
  rawRow: string;
};

type PreviewResult = {
  meta: PreviewMeta;
  rows: PreviewRow[];
};

type ImportTarget = {
  id: string;
  title: string;
  status: string;
};

export default function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [importComment, setImportComment] = useState("");
  const [selectedTargetByRow, setSelectedTargetByRow] = useState<Record<number, string | null>>({});
  const [targets, setTargets] = useState<ImportTarget[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmResult, setConfirmResult] = useState<{ createdCount: number; skippedCount: number } | null>(null);

  useEffect(() => {
    const loadTargets = async () => {
      try {
        const res = await fetch("/api/admin/targets");
        if (!res.ok) return;
        const data = (await res.json()) as { items?: ImportTarget[] };
        if (data.items) {
          setTargets(data.items.filter((item) => item.status === "active"));
        }
      } catch {
        // ignore
      }
    };
    loadTargets();
  }, []);

  const reset = () => {
    setFile(null);
    setResult(null);
    setHeaders([]);
    setMapping({});
    setSelectedRows([]);
    setImportComment("");
    setSelectedTargetByRow({});
    setConfirmResult(null);
    setStatusMessage(null);
  };

  const mappingFields: Array<{ label: string; key: keyof typeof mapping }> = [
    { label: "Дата", key: "paidAt" },
    { label: "Сумма", key: "amount" },
    { label: "Назначение", key: "purpose" },
    { label: "Улица", key: "street" },
    { label: "Участок", key: "plotNumber" },
    { label: "Номер операции", key: "reference" },
  ];

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    reset();
    if (selected) {
      setFile(selected);
    }
  };

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows((prev) =>
      prev.includes(rowIndex) ? prev.filter((index) => index !== rowIndex) : [...prev, rowIndex]
    );
  };

  const selectAllValid = () => {
    if (!result) return;
    const validIndexes = result.rows.filter((row) => row.status === "OK").map((row) => row.rowIndex);
    setSelectedRows(validIndexes);
  };

  const handlePreview = async () => {
    if (!file) return;
    setPreviewLoading(true);
    setStatusMessage(null);
    setResult(null);
    setConfirmResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (Object.keys(mapping).length > 0) {
        formData.append("mapping", JSON.stringify(mapping));
      }
      const response = await fetch("/api/admin/billing/import/preview", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        let errorText = "Ошибка проверки файла";
        try {
          const payload = await response.json();
          errorText = payload.error || errorText;
        } catch {
          const text = await response.text();
          if (text) errorText = text;
        }
        setStatusMessage({ type: "error", text: errorText });
        return;
      }
      const data = (await response.json()) as PreviewResult;
      setResult(data);
      if (data.meta.headers) {
        setHeaders(data.meta.headers);
      }
      const validIndexes = data.rows.filter((row) => row.status === "OK").map((row) => row.rowIndex);
      setSelectedRows(validIndexes);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: (error as Error).message || "Не удалось проверить файл",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    const rowsToImport = result.rows
      .filter((row) => selectedRows.includes(row.rowIndex) && row.status === "OK")
      .map((row) => ({
        rowIndex: row.rowIndex,
        paidAtIso: row.paidAtIso ?? "",
        amount: row.amount ?? 0,
        purpose: row.purpose ?? null,
        plotIdMatched: row.plotIdMatched ?? "",
        reference: row.reference ?? null,
        category: row.category ?? null,
        targetFundId:
          selectedTargetByRow[row.rowIndex] ??
          row.suggestedTargetFundId ??
          row.matchedTargetFundId ??
          null,
        fingerprint: row.fingerprint ?? null,
      }));
    if (!rowsToImport.length) {
      setStatusMessage({ type: "error", text: "Выберите хотя бы одну строку для импорта" });
      return;
    }
    setConfirmLoading(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/admin/billing/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file?.name ?? null,
          comment: importComment,
          totals: result.meta,
          warnings: result.meta.warnings,
          previewRows: result.rows,
          rows: rowsToImport,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        const errorText = payload.error ?? "Ошибка импорта";
        setStatusMessage({ type: "error", text: errorText });
        return;
      }
      const createdCount = payload.createdCount ?? 0;
      const skippedCount = payload.skippedCount ?? 0;
      setConfirmResult({
        createdCount,
        skippedCount,
      });
      setStatusMessage({ 
        type: "success", 
        text: `Импорт завершён успешно. Создано платежей: ${createdCount}${skippedCount > 0 ? `, пропущено: ${skippedCount}` : ""}` 
      });
      setSelectedRows([]);
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: (error as Error).message || "Ошибка подтверждения импорта",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const activeMeta = result?.meta;
  const validCount = activeMeta?.validCount ?? 0;
  const invalidCount = activeMeta?.invalidCount ?? 0;
  const unmatchedCount = activeMeta?.unmatchedCount ?? 0;
  const duplicateCount = activeMeta?.duplicates ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              data-testid="billing-import-file-input"
            />
            {file ? <span className="text-xs text-zinc-500">{file.name}</span> : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!file || previewLoading}
              data-testid="billing-import-preview-button"
              className="rounded border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {previewLoading ? "Проверяем…" : "Проверить"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Очистить
            </button>
          </div>
        </div>
        {headers.length > 0 && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="text-sm font-semibold text-zinc-800">Сопоставление колонок</div>
            <div className="space-y-2 sm:col-span-2">
              {mappingFields.map(({ label, key }) => (
                <label key={label} className="flex items-center gap-2 text-sm text-zinc-700">
                  <span className="min-w-[140px]">{label}</span>
                  <select
                    value={mapping[key] ?? ""}
                    onChange={(event) =>
                      setMapping((prev) => {
                        const next = { ...prev };
                        if (event.target.value) {
                          next[key] = event.target.value;
                        } else {
                          delete next[key];
                        }
                        return next;
                      })
                    }
                    className="flex-1 rounded border border-zinc-300 px-2 py-1"
                  >
                    <option value="">Авто</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setMapping({})}
                className="rounded border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100"
              >
                Сбросить сопоставление
              </button>
            </div>
          </div>
        )}
      </div>

      {statusMessage ? (
        <div
          data-testid="billing-import-status"
          role="alert"
          className={`rounded border px-3 py-2 text-sm ${
            statusMessage.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      {result && activeMeta ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <div className="text-sm text-zinc-900" data-testid="billing-import-total-count">
                {activeMeta.totalRows}
              </div>
              Всего строк
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <div className="text-sm text-green-700" data-testid="billing-import-valid-count">
                {validCount}
              </div>
              Валидных
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <div className="text-sm text-red-700" data-testid="billing-import-invalid-count">
                {invalidCount}
              </div>
              Ошибок
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <div className="text-sm text-amber-700" data-testid="billing-import-unmatched-count">
                {unmatchedCount}
              </div>
              Без участка
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
            <button
              type="button"
              onClick={selectAllValid}
              className="rounded border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Выбрать все валидные ({validCount})
            </button>
            <span>{duplicateCount} дубликатов</span>
            {activeMeta.truncated ? (
              <span className="text-xs text-zinc-500">Показаны первые {activeMeta.totalRows} строк</span>
            ) : null}
            <input
              type="text"
              placeholder="Комментарий к импорту"
              className="min-w-[240px] rounded border border-zinc-300 px-2 py-1 text-xs"
              value={importComment}
              onChange={(event) => setImportComment(event.target.value)}
            />
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedRows.length || confirmLoading}
              data-testid="billing-import-confirm-button"
              className="rounded bg-[#5E704F] px-3 py-1 text-sm font-semibold text-white transition hover:bg-[#4f5f42] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmLoading ? "Импортируем…" : "Подтвердить импорт"}
            </button>
          </div>

          {confirmResult ? (
            <div className="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700" data-testid="billing-import-confirm-result">
              <div>Создано платежей: <strong>{confirmResult.createdCount}</strong></div>
              {confirmResult.skippedCount > 0 && (
                <div>Пропущено: <strong>{confirmResult.skippedCount}</strong></div>
              )}
            </div>
          ) : null}

          <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-xs sm:text-sm" data-testid="billing-import-preview-table">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-2 py-2 text-left">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                      checked={selectedRows.length === validCount && validCount > 0}
                      onChange={(event) => (event.target.checked ? selectAllValid() : setSelectedRows([]))}
                      data-testid="billing-import-select-all"
                    />
                  </th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Статус</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Дата</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Сумма</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Категория</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Цель</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Улица/участок</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Найден</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Reference</th>
                  <th className="px-2 py-2 text-left font-semibold text-zinc-700">Ошибка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {result.rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-zinc-500">
                      Нет данных
                    </td>
                  </tr>
                )}
                {result.rows.map((row) => {
                  const selectable = row.status === "OK";
                  const isSelected = selectedRows.includes(row.rowIndex);
                  const rowBg =
                    row.status === "ERROR"
                      ? "bg-red-50"
                      : row.status === "DUPLICATE"
                        ? "bg-amber-50"
                        : "bg-white";
                  const statusClass =
                    row.status === "OK"
                      ? "text-green-700"
                      : row.status === "DUPLICATE"
                        ? "text-amber-700"
                        : "text-red-700";

                  return (
                    <tr 
                      key={row.rowIndex} 
                      className={`${rowBg}`}
                      data-testid={`billing-import-row-${row.rowIndex}`}
                      data-row-status={row.status}
                    >
                      <td className="px-2 py-1">
                        {selectable && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row.rowIndex)}
                            data-testid={`billing-import-row-checkbox-${row.rowIndex}`}
                          />
                        )}
                      </td>
                      <td className={`px-2 py-1 font-semibold ${statusClass}`} data-testid={`billing-import-row-status-${row.rowIndex}`}>{row.status}</td>
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
                            onChange={(event) =>
                              setSelectedTargetByRow((prev) => ({
                                ...prev,
                                [row.rowIndex]: event.target.value || null,
                              }))
                            }
                          >
                            <option value="">Не выбрано</option>
                            {targets.map((target) => (
                              <option key={target.id} value={target.id}>
                                {target.title}
                              </option>
                            ))}
                          </select>
                        )}
                        {row.warning === "target_fund_missing" ? (
                          <div className="text-xs text-amber-700">Цель не определена</div>
                        ) : null}
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
                      <td className="px-2 py-1 text-xs text-red-700">
                        {row.errors?.length ? row.errors.join(", ") : row.error ?? ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {result?.meta?.warnings?.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Предупреждения: {result.meta.warnings.join(", ")}
        </div>
      ) : null}

      {previewLoading && <div className="text-sm text-zinc-600">Обрабатываем файл...</div>}
    </div>
  );
}
