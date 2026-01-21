"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { PaymentImport } from "@/types/snt";
import { readOk } from "@/lib/api/client";

type ImportWithNames = PaymentImport & {
  createdByName: string;
  appliedByName?: string | null;
};

type ImportsResponse = {
  imports: ImportWithNames[];
};

export default function PaymentsImportsJournalClient() {
  const [imports, setImports] = useState<ImportWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadImports();
  }, []);

  const loadImports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/payments-imports", { cache: "no-store" });
      const { imports } = await readOk<ImportsResponse>(res);
      setImports(imports || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusLabel = (status: PaymentImport["status"]) => {
    switch (status) {
      case "draft":
        return "Черновик";
      case "applied":
        return "Применён";
      case "cancelled":
        return "Отменён";
      default:
        return status;
    }
  };

  const statusColor = (status: PaymentImport["status"]) => {
    switch (status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "applied":
        return "bg-green-100 text-green-800 border-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-zinc-100 text-zinc-800 border-zinc-200";
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-600">Загрузка...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
        {error}
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
              <th className="px-4 py-3 text-left font-semibold text-zinc-700">Кто создал</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-700">Статус</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Строк</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Совпало</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Не совпало</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-700">Ошибок</th>
              <th className="px-4 py-3 text-center font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {imports.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                  Нет импортов
                </td>
              </tr>
            ) : (
              imports.map((imp) => (
                <tr key={imp.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-700">{formatDate(imp.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-700">{imp.fileName}</td>
                  <td className="px-4 py-3 text-zinc-700">{imp.createdByName}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusColor(imp.status)}`}
                    >
                      {statusLabel(imp.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700">{imp.totalRows}</td>
                  <td className="px-4 py-3 text-right text-green-700">{imp.matchedRows}</td>
                  <td className="px-4 py-3 text-right text-yellow-700">{imp.unmatchedRows}</td>
                  <td className="px-4 py-3 text-right text-red-700">
                    {imp.totalRows - imp.matchedRows - imp.unmatchedRows}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/billing/payments-imports/${imp.id}`}
                      className="text-[#5E704F] hover:underline text-sm font-semibold"
                    >
                      Открыть
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
