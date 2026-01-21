"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAdminTime } from "@/lib/settings.shared";
import { apiGet } from "@/lib/api/client";

type RegistryImport = {
  id: string;
  createdAt: string;
  userId: string | null;
  fileName: string | null;
  summary: string;
  errorsCount: number;
};

export default function RegistryImportHistoryClient() {
  const [imports, setImports] = useState<RegistryImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadImports = async () => {
      try {
        const data = await apiGet<{ items?: RegistryImport[] }>("/api/admin/registry/import/history");
        if (!cancelled) {
          setImports(data.items || []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
          setLoading(false);
        }
      }
    };

    loadImports();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 shadow-sm">
        <div className="text-sm text-zinc-600">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <div className="font-semibold">Ошибка</div>
        <div>{error}</div>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="text-sm text-zinc-600">История импортов пуста</div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/registry/import"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Создать импорт
          </Link>
          <Link
            href="/admin/registry"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Назад к реестру
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Дата</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Файл</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Результат</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Ошибки</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {imports.map((importItem) => (
              <tr key={importItem.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-zinc-700">{formatAdminTime(importItem.createdAt)}</td>
                <td className="px-4 py-3 text-zinc-700">{importItem.fileName || "—"}</td>
                <td className="px-4 py-3 text-zinc-700">{importItem.summary}</td>
                <td className="px-4 py-3">
                  {importItem.errorsCount > 0 ? (
                    <span className="text-red-600">{importItem.errorsCount}</span>
                  ) : (
                    <span className="text-emerald-600">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/registry/import"
          className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
        >
          Создать импорт
        </Link>
        <Link
          href="/admin/registry"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Назад к реестру
        </Link>
      </div>
    </div>
  );
}
