"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ImportPreviewRow } from "@/server/services/finance";
import { apiPost } from "@/lib/api/client";

type Props = {
  step: string;
  confirmAction: (formData: FormData) => Promise<void>;
};

export default function FinanceImportClient({ step, confirmAction }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: ImportPreviewRow[]; totalRows: number; validRows: number; errorRows: number; duplicateRows: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const text = await file.text();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("content", text);

      const data = await apiPost<{ rows: ImportPreviewRow[]; totalRows: number; validRows: number; errorRows: number; duplicateRows: number }>(
        "/api/office/finance/import/preview",
        formData
      );
      setPreview(data);
      router.push("/office/finance/import?step=preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при загрузке файла");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("rows", JSON.stringify(preview.rows));
      await confirmAction(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при подтверждении импорта");
      setLoading(false);
    }
  };

  if (step === "success") {
    const params = new URLSearchParams(window.location.search);
    const imported = params.get("imported") || "0";
    const skipped = params.get("skipped") || "0";

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="text-lg font-semibold text-emerald-900">Импорт завершён</div>
        <div className="mt-2 text-sm text-emerald-700">
          Импортировано: {imported}, пропущено: {skipped}
        </div>
        <button
          onClick={() => router.push("/office/finance")}
          className="mt-4 rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4b5b40]"
        >
          Вернуться к финансам
        </button>
      </div>
    );
  }

  if (step === "preview" && preview) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Предпросмотр импорта</h2>
              <p className="text-sm text-zinc-600">
                Всего строк: {preview.totalRows}, валидных: {preview.validRows}, ошибок: {preview.errorRows}, дубликатов: {preview.duplicateRows}
              </p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-zinc-50 sticky top-0">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-600">
                  <th className="px-3 py-2">Строка</th>
                  <th className="px-3 py-2">Дата</th>
                  <th className="px-3 py-2">Сумма</th>
                  <th className="px-3 py-2">Участок</th>
                  <th className="px-3 py-2">Назначение</th>
                  <th className="px-3 py-2">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {preview.rows.slice(0, 100).map((row) => (
                  <tr key={row.rowIndex} className={row.status === "ERROR" ? "bg-rose-50" : row.status === "DUPLICATE" ? "bg-amber-50" : ""}>
                    <td className="px-3 py-2 text-sm text-zinc-700">{row.rowIndex}</td>
                    <td className="px-3 py-2 text-sm text-zinc-700">{row.date}</td>
                    <td className="px-3 py-2 text-sm text-zinc-700">{row.amount}</td>
                    <td className="px-3 py-2 text-sm text-zinc-700">{row.plotNumber}</td>
                    <td className="px-3 py-2 text-sm text-zinc-700">{row.purpose}</td>
                    <td className="px-3 py-2 text-sm">
                      {row.status === "OK" && <span className="text-emerald-600">✓ OK</span>}
                      {row.status === "ERROR" && <span className="text-rose-600">✗ Ошибка</span>}
                      {row.status === "DUPLICATE" && <span className="text-amber-600">⚠ Дубликат</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.errorRows > 0 && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              Внимание: {preview.errorRows} строк содержат ошибки и будут пропущены при импорте.
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={loading || preview.validRows === 0}
              className="rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4b5b40] disabled:opacity-50"
            >
              {loading ? "Импорт..." : `Подтвердить импорт (${preview.validRows} строк)`}
            </button>
            <button
              onClick={() => {
                setPreview(null);
                router.push("/office/finance/import");
              }}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-zinc-800">Выберите CSV файл</label>
          <p className="mt-1 text-xs text-zinc-600">
            Файл должен содержать колонки: Дата, Сумма, Участок (опционально), Назначение (опционально)
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={loading}
          className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#5E704F] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#4b5b40] disabled:opacity-50"
        />

        {loading && <div className="text-sm text-zinc-600">Загрузка и обработка файла...</div>}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        )}
      </div>
    </div>
  );
}
