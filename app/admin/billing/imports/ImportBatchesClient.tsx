"use client";

import { useState } from "react";
import type { ImportBatch } from "@/types/snt";

interface Props {
  initialBatches: ImportBatch[];
}

export default function ImportBatchesClient({ initialBatches }: Props) {
  const [batches, setBatches] = useState<ImportBatch[]>(initialBatches);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleRollback = async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/billing/imports/${id}/rollback`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка отката");
        return;
      }
      setBatches((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "rolled_back", rollbackAt: new Date().toISOString() } : b))
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <th className="px-3 py-2">Дата</th>
              <th className="px-3 py-2">Файл</th>
              <th className="px-3 py-2">Создано</th>
              <th className="px-3 py-2">Пропущено</th>
              <th className="px-3 py-2">Комментарий</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm text-zinc-800">
            {batches.map((batch) => (
              <tr key={batch.id} className="align-middle">
                <td className="px-3 py-2">{new Date(batch.importedAt).toLocaleString("ru-RU")}</td>
                <td className="px-3 py-2">{batch.fileName ?? "—"}</td>
                <td className="px-3 py-2">{batch.createdCount}</td>
                <td className="px-3 py-2">{batch.skippedCount}</td>
                <td className="px-3 py-2">{batch.comment ?? "—"}</td>
                <td className="px-3 py-2">
                  {batch.status === "rolled_back" ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                      Откатан
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      Завершён
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {batch.status === "completed" ? (
                    <button
                      type="button"
                      disabled={loadingId === batch.id}
                      onClick={() => handleRollback(batch.id)}
                      className="rounded border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingId === batch.id ? "Откатываем..." : "Откатить"}
                    </button>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-zinc-600" colSpan={7}>
                  Импортов пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
