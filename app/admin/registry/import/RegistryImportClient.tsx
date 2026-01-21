"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { readOk } from "@/lib/api/client";

interface PreviewPerson {
  key: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  plots: Array<{
    plotNumber: string;
    sntStreetNumber: string;
    cityAddress?: string | null;
  }>;
}

interface ImportSessionRow {
  rowIndex: number;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  sntStreetNumber?: string;
  plotNumber?: string;
  cityAddress?: string | null;
  note?: string | null;
  errors: string[];
}

interface PreviewResult {
  importSessionId?: string; // New: session ID
  persons: PreviewPerson[]; // Legacy: for backward compatibility
  errors: Array<{ rowIndex: number; message: string }>; // Legacy
  rowErrors?: Array<{ rowIndex: number; errors: string[] }>; // New: errors per row
  rows?: ImportSessionRow[]; // New: raw rows for editing
  summary: {
    totalPersons: number;
    totalPlots: number;
    errorsCount: number;
    totalRows?: number; // New
    errorRows?: number; // New
    validRows?: number; // New
  };
}

export default function RegistryImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ summary: unknown; errors?: unknown[] } | null>(null);

  // Local state for row editing (keyed by rowIndex)
  const [rowsState, setRowsState] = useState<Map<number, ImportSessionRow>>(new Map());

  // Initialize rowsState from preview
  useEffect(() => {
    if (preview?.rows) {
      const newMap = new Map<number, ImportSessionRow>();
      for (const row of preview.rows) {
        newMap.set(row.rowIndex, row);
      }
      setRowsState(newMap);
    } else if (preview?.rowErrors) {
      // If we have rowErrors but no rows, create rows from errors
      const newMap = new Map<number, ImportSessionRow>();
      for (const rowError of preview.rowErrors) {
        const existing = rowsState.get(rowError.rowIndex);
        newMap.set(rowError.rowIndex, {
          rowIndex: rowError.rowIndex,
          errors: rowError.errors,
          ...existing,
        });
      }
      setRowsState(newMap);
    }
  }, [preview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setPreview(null);
      setImportResult(null);
      setRowsState(new Map());
      setEditingRowIndex(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError("Выберите файл для предпросмотра");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/registry/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = await readOk<PreviewResult>(res);
      setPreview(data);
    } catch (e) {
      setError((e as Error).message || "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handlePatchRow = async (rowIndex: number, patch: Partial<ImportSessionRow>) => {
    if (!preview?.importSessionId) return;

    try {
      const res = await fetch("/api/admin/registry/import/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: preview.importSessionId,
          rowIndex,
          patch,
        }),
      });
      const data = await readOk<{
        rowErrors: Array<{ rowIndex: number; errors: string[] }>;
        summary: { totalRows: number; errorRows: number; validRows: number };
      }>(res);

      // Update local state
      const updatedRows = new Map(rowsState);
      const row = updatedRows.get(rowIndex);
      if (row) {
        updatedRows.set(rowIndex, { ...row, ...patch, errors: data.rowErrors.find((r) => r.rowIndex === rowIndex)?.errors || [] });
      }
      setRowsState(updatedRows);

      // Update preview summary
      if (preview) {
        setPreview({
          ...preview,
          rowErrors: data.rowErrors,
          summary: { ...preview.summary, ...data.summary },
        });
      }

      setEditingRowIndex(null);
    } catch (e) {
      setError((e as Error).message || "Ошибка сети");
    }
  };

  const handleImport = async () => {
    if (!preview) {
      setError("Нет данных для импорта");
      return;
    }

    // Check if there are errors
    const hasErrors = preview.summary.errorRows && preview.summary.errorRows > 0;
    if (hasErrors && !confirm(`Импорт содержит ${preview.summary.errorRows} строк с ошибками. Продолжить с частичным импортом?`)) {
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/registry/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: preview.importSessionId || undefined,
          allowPartial: hasErrors,
          fileName: file?.name || "unknown.csv",
          // Legacy fallback: persons array
          persons: preview.importSessionId ? undefined : preview.persons,
        }),
      });
      const data = await readOk<{ summary: unknown; errors?: unknown[] }>(res);
      setImportResult(data);
      setTimeout(() => {
        router.push("/admin/registry?tab=people");
      }, 2000);
    } catch (e) {
      setError((e as Error).message || "Ошибка сети");
    } finally {
      setImporting(false);
    }
  };

  const rows = preview?.rows || Array.from(rowsState.values());

  return (
    <div className="space-y-6">
      {/* File selection */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Выберите CSV файл</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Поддерживаются два формата CSV (автоопределение по заголовкам):
          <br />
          <strong>Формат v1:</strong> №, ФИО, Ул., Уч., Адрес, Тел.р
          <br />
          <strong>Формат v2:</strong> Улица_СНТ_номер, Участок_номер, ФИО, Телефон, Email, Городской_адрес, Примечание
          <br />
          Разделитель: точка с запятой или запятая (UTF-8).
        </p>
        <div className="mb-4 flex gap-3">
          <a
            href="/api/admin/registry/import/template"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Скачать шаблон CSV (v2)
          </a>
        </div>
        <div className="flex gap-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          {file && (
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {loading ? "Загрузка..." : "Предпросмотр"}
            </button>
          )}
        </div>
        {file && <p className="mt-2 text-sm text-zinc-600">Выбран файл: {file.name}</p>}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {error}
        </div>
      )}

      {/* Preview with rows table */}
      {preview && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Предпросмотр</h2>
            <div className="mb-4 grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <div className="text-xs text-zinc-600">Всего строк</div>
                <div className="text-lg font-semibold text-zinc-900">{preview.summary.totalRows ?? preview.summary.totalPlots}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-600">Валидных строк</div>
                <div className="text-lg font-semibold text-green-700">{preview.summary.validRows ?? preview.summary.totalPlots - preview.summary.errorsCount}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-600">Строк с ошибками</div>
                <div className="text-lg font-semibold text-red-700">{preview.summary.errorRows ?? preview.summary.errorsCount}</div>
              </div>
            </div>

            {/* Rows table with inline editing */}
            {rows.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200 text-xs">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Строка</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">ФИО *</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Улица СНТ *</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок *</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Телефон</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Городской адрес</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Ошибки</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {rows.map((row) => {
                      const isEditing = editingRowIndex === row.rowIndex;
                      const hasErrors = row.errors.length > 0;
                      return (
                        <tr key={row.rowIndex} className={hasErrors ? "bg-red-50" : ""}>
                          <td className="px-3 py-2 text-zinc-700">{row.rowIndex}</td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={row.fullName || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== row.fullName) {
                                    handlePatchRow(row.rowIndex, { fullName: e.target.value });
                                  } else {
                                    setEditingRowIndex(null);
                                  }
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-1"
                                autoFocus
                              />
                            ) : (
                              <span className={!row.fullName ? "text-red-600" : ""}>{row.fullName || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={row.sntStreetNumber || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== row.sntStreetNumber) {
                                    handlePatchRow(row.rowIndex, { sntStreetNumber: e.target.value });
                                  }
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-1"
                              />
                            ) : (
                              <span className={!row.sntStreetNumber ? "text-red-600" : ""}>{row.sntStreetNumber || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={row.plotNumber || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== row.plotNumber) {
                                    handlePatchRow(row.rowIndex, { plotNumber: e.target.value });
                                  }
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-1"
                              />
                            ) : (
                              <span className={!row.plotNumber ? "text-red-600" : ""}>{row.plotNumber || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="tel"
                                defaultValue={row.phone || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (row.phone || "")) {
                                    handlePatchRow(row.rowIndex, { phone: e.target.value || null });
                                  }
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-1"
                              />
                            ) : (
                              <span>{row.phone || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="email"
                                defaultValue={row.email || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (row.email || "")) {
                                    handlePatchRow(row.rowIndex, { email: e.target.value || null });
                                  }
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-1"
                              />
                            ) : (
                              <span>{row.email || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={row.cityAddress || ""}
                                onBlur={(e) => {
                                  if (e.target.value !== (row.cityAddress || "")) {
                                    handlePatchRow(row.rowIndex, { cityAddress: e.target.value || null });
                                  }
                                }}
                                className="w-full rounded border border-zinc-300 px-2 py-1"
                              />
                            ) : (
                              <span>{row.cityAddress || "—"}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {hasErrors ? (
                              <ul className="text-xs text-red-700">
                                {row.errors.map((err, idx) => (
                                  <li key={idx}>{err}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-green-700">✓</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => setEditingRowIndex(null)}
                                className="text-xs text-zinc-600 hover:text-zinc-900"
                              >
                                Отмена
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditingRowIndex(row.rowIndex)}
                                className="text-xs text-[#5E704F] hover:underline"
                              >
                                Редактировать
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legacy persons table (if no rows) */}
            {rows.length === 0 && preview.persons && preview.persons.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-lg border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200 text-xs">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">ФИО</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Телефон</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Email</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участки</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {preview.persons.slice(0, 20).map((person, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-zinc-900">{person.fullName}</td>
                        <td className="px-3 py-2 text-zinc-700">{person.phone || "—"}</td>
                        <td className="px-3 py-2 text-zinc-700">{person.email || "—"}</td>
                        <td className="px-3 py-2 text-zinc-700">
                          {person.plots.map((p, pidx) => (
                            <span key={pidx} className="mr-1 rounded bg-zinc-100 px-1 py-0.5">
                              Линия {p.sntStreetNumber}, участок {p.plotNumber}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Apply button */}
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {importing ? "Импорт..." : preview.summary.errorRows && preview.summary.errorRows > 0 ? "Применить частично" : "Применить импорт"}
              </button>
              {preview.summary.errorRows && preview.summary.errorRows > 0 && (
                <span className="text-xs text-red-700">
                  Исправьте ошибки или используйте &quot;Применить частично&quot; для импорта только валидных строк
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <div className="font-semibold">Импорт завершён</div>
          <div className="mt-2 space-y-1 text-xs">
            {importResult.summary && typeof importResult.summary === "object" ? (
              <>
                <div>Создано людей: {(importResult.summary as { createdPersons?: number }).createdPersons ?? 0}</div>
                <div>Обновлено людей: {(importResult.summary as { updatedPersons?: number }).updatedPersons ?? 0}</div>
                <div>Создано участков: {(importResult.summary as { createdPlots?: number }).createdPlots ?? 0}</div>
                <div>Обновлено участков: {(importResult.summary as { updatedPlots?: number }).updatedPlots ?? 0}</div>
                <div>Создано кодов: {(importResult.summary as { createdInviteCodes?: number }).createdInviteCodes ?? 0}</div>
                {(importResult.summary as { errors?: number }).errors && (importResult.summary as { errors?: number }).errors! > 0 && (
                  <div className="text-red-700">Ошибок: {(importResult.summary as { errors?: number }).errors}</div>
                )}
              </>
            ) : null}
          </div>
          <div className="mt-2 text-xs">Перенаправление на страницу реестра...</div>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/admin/registry"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Отмена
        </Link>
      </div>
    </div>
  );
}
