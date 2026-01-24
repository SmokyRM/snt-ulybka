"use client";

import { useState } from "react";
import { readOk } from "@/lib/api/client";

export default function ImportCSV() {
  const [step, setStep] = useState<"upload" | "preview" | "applied">("upload");
  const [file, setFile] = useState<File | null>(null);
  type PreviewPayload = {
    preview: Array<{
      row: number;
      plotId: string;
      meterNumber?: string;
      readingDate: string;
      value: number;
      previousValue?: number | null;
      consumption?: number | null;
      status: "valid" | "error";
      error?: string;
    }>;
    summary: { total: number; valid: number; errors: number };
  };

  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = async () => {
    try {
      // raw endpoint (csv download)
      const res = await fetch("/api/admin/electricity/readings/import/template");
      if (!res.ok) {
        setError("Не удалось скачать шаблон");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `electricity-readings-template-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError("Выберите файл");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/electricity/readings/import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await readOk<PreviewPayload>(res);
      setPreview(data);
      setStep("preview");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleApply = async () => {
    if (!preview) return;

    const validRows = preview.preview
      .filter((p) => p.status === "valid")
      .map((p) => ({
        plotId: p.plotId,
        meterNumber: p.meterNumber,
        readingDate: p.readingDate,
        value: p.value,
      }));

    if (validRows.length === 0) {
      setError("Нет валидных строк для импорта");
      return;
    }

    setApplying(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/electricity/readings/import/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      await readOk(res);

      setStep("applied");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900">Импорт из CSV</h2>

      {step === "upload" && (
        <div className="space-y-4">
          <div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Скачать шаблон CSV
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Выберите CSV файл</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handlePreview}
            disabled={!file}
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:opacity-50"
          >
            Предпросмотр
          </button>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="text-sm">
              <div>Всего строк: {preview.summary.total}</div>
              <div className="text-green-700">Валидных: {preview.summary.valid}</div>
              <div className="text-red-700">Ошибок: {preview.summary.errors}</div>
            </div>
          </div>

          <div className="max-h-96 overflow-auto rounded border border-zinc-200">
            <table className="min-w-full divide-y divide-zinc-200 text-xs">
              <thead className="bg-zinc-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold">Строка</th>
                  <th className="px-2 py-1 text-left font-semibold">Участок</th>
                  <th className="px-2 py-1 text-left font-semibold">№ счётчика</th>
                  <th className="px-2 py-1 text-left font-semibold">Дата</th>
                  <th className="px-2 py-1 text-left font-semibold">Значение</th>
                  <th className="px-2 py-1 text-left font-semibold">Предыдущее</th>
                  <th className="px-2 py-1 text-left font-semibold">Потребление</th>
                  <th className="px-2 py-1 text-left font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {preview.preview.map((row) => (
                  <tr key={row.row} className={row.status === "error" ? "bg-red-50" : ""}>
                    <td className="px-2 py-1">{row.row}</td>
                    <td className="px-2 py-1">{row.plotId}</td>
                    <td className="px-2 py-1">{row.meterNumber || "—"}</td>
                    <td className="px-2 py-1">{row.readingDate}</td>
                    <td className="px-2 py-1">{row.value}</td>
                    <td className="px-2 py-1">{row.previousValue ?? "—"}</td>
                    <td className="px-2 py-1">{row.consumption !== null ? `${row.consumption} кВт·ч` : "—"}</td>
                    <td className="px-2 py-1">
                      {row.status === "error" ? (
                        <span className="text-red-700 text-xs">{row.error}</span>
                      ) : (
                        <span className="text-green-700 text-xs">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setPreview(null);
                setFile(null);
              }}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || preview.summary.valid === 0}
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:opacity-50"
            >
              {applying ? "Импорт..." : `Применить (${preview.summary.valid} строк)`}
            </button>
          </div>
        </div>
      )}

      {step === "applied" && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Импорт успешно выполнен. Страница обновится через несколько секунд...
        </div>
      )}
    </div>
  );
}
