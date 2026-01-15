"use client";

import { useState } from "react";
import type { BillingImport, BillingImportError } from "@/types/snt";

type DetailResponse = {
  billingImport: BillingImport;
  batchStatus: string | null;
  errors: BillingImportError[];
};

interface Props {
  initialBatches: BillingImport[];
}

export default function ImportBatchesClient({ initialBatches }: Props) {
  const [imports, setImports] = useState<BillingImport[]>(initialBatches);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const detailRows = detail?.errors ?? [];

  const handleSelect = async (id: string) => {
    setActiveImportId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/billing/imports/${id}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setToast({ type: "error", text: payload.error ?? "Не удалось загрузить детали" });
        return;
      }
      const payload = (await res.json()) as DetailResponse & { ok: boolean };
      setDetail(payload);
    } catch {
      setToast({ type: "error", text: "Не удалось загрузить детали" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Вы уверены, что хотите отменить этот импорт? Платежи будут помечены как отменённые (не удалены).")) {
      return;
    }
    setActionLoadingId(id);
    setToast(null);
    try {
      const res = await fetch(`/api/admin/billing/imports/${id}/rollback`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok) {
        const errorText = payload.error ?? "Ошибка отмены импорта";
        setToast({ type: "error", text: errorText });
        return;
      }
      const voided = payload.voided ?? 0;
      setImports((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "cancelled", cancelledAt: new Date().toISOString() }
            : item
        )
      );
      setToast({ 
        type: "success", 
        text: payload.message ?? `Импорт отменён. Отменено платежей: ${voided}` 
      });
      if (activeImportId === id && detail) {
        setDetail((prev) =>
          prev ? { ...prev, billingImport: { ...prev.billingImport, status: "cancelled" } } : prev
        );
      }
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Ошибка отмены импорта";
      setToast({ type: "error", text: errorText });
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderStatus = (item: BillingImport) => {
    if (item.status === "completed") {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          Завершён
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        Отменён
      </span>
    );
  };

  const exportUrl = (id: string, type: "invalid" | "unmatched") =>
    `/api/admin/billing/imports/${id}/export?type=${type}`;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
      {toast ? (
        <div
          role="alert"
          data-testid="billing-imports-toast"
          className={`rounded border px-3 py-2 text-sm ${
            toast.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast.text}
        </div>
      ) : null}
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50 text-left text-xs font-semibold uppercase text-zinc-600">
            <tr>
              <th className="px-3 py-2">Дата</th>
              <th className="px-3 py-2">Файл</th>
              <th className="px-3 py-2">Результат</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Валидация</th>
              <th className="px-3 py-2">Комментарий</th>
              <th className="px-3 py-2">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-sm text-zinc-800">
            {imports.map((item) => (
              <tr
                key={item.id}
                className={activeImportId === item.id ? "bg-zinc-50" : ""}
              >
                <td className="px-3 py-2">
                  {new Date(item.createdAt).toLocaleString("ru-RU")}
                </td>
                <td className="px-3 py-2">{item.fileName ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="text-xs text-zinc-500">
                    {item.totals.valid} / {item.totals.total}
                  </div>
                </td>
                <td className="px-3 py-2">{renderStatus(item)}</td>
                <td className="px-3 py-2 text-xs">
                  Ошибки: {item.totals.invalid} | Без участка: {item.totals.unmatched} | Дубликаты:{" "}
                  {item.totals.duplicates}
                </td>
                <td className="px-3 py-2">{item.comment ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      data-testid={`billing-import-view-${item.id}`}
                      className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                    >
                      Просмотреть
                    </button>
                    {item.status === "completed" ? (
                      <button
                        type="button"
                        disabled={actionLoadingId === item.id}
                        onClick={() => handleCancel(item.id)}
                        data-testid={`billing-import-cancel-${item.id}`}
                        className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {actionLoadingId === item.id ? "Отменяем…" : "Отменить импорт"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {imports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-3 text-center text-zinc-500">
                  Импортов пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailLoading ? (
        <div className="text-sm text-zinc-600" data-testid="billing-import-detail-loading">Загружаем детали...</div>
      ) : detail ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800" data-testid="billing-import-detail">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500">Детали</div>
              <div className="text-lg font-semibold">Импорт #{detail.billingImport.id}</div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <a
                className="rounded-full border border-[#5E704F] px-3 py-1 font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                href={exportUrl(detail.billingImport.id, "invalid")}
                data-testid="billing-import-export-invalid"
              >
                Export invalid
              </a>
              <a
                className="rounded-full border border-[#5E704F] px-3 py-1 font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                href={exportUrl(detail.billingImport.id, "unmatched")}
                data-testid="billing-import-export-unmatched"
              >
                Export unmatched
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs text-zinc-500">Всего</div>
              <div className="text-lg font-semibold">{detail.billingImport.totals.total}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Валидных</div>
              <div className="text-lg font-semibold text-green-700">{detail.billingImport.totals.valid}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Ошибок</div>
              <div className="text-lg font-semibold text-red-700">{detail.billingImport.totals.invalid}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Без участка</div>
              <div className="text-lg font-semibold text-amber-700">{detail.billingImport.totals.unmatched}</div>
            </div>
          </div>
          {detail.billingImport.warnings?.length ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Предупреждения: {detail.billingImport.warnings.join(", ")}
            </div>
          ) : null}
          <div className="space-y-1 text-xs">
            <div>Комментарий: {detail.billingImport.comment ?? "—"}</div>
            <div>Статус пакета: {detail.batchStatus ?? "—"}</div>
            <div>Ошибок в импорте: {detailRows.length}</div>
          </div>
          {detailRows.length > 0 ? (
            <div className="overflow-auto rounded border border-zinc-200 bg-white p-3 text-xs">
              <table className="min-w-full text-left">
                <thead className="text-[11px] uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-2 py-1">Строка</th>
                    <th className="px-2 py-1">Тип</th>
                    <th className="px-2 py-1">Причина</th>
                    <th className="px-2 py-1">Данные</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRows.slice(0, 5).map((error) => (
                    <tr key={error.id} className="border-t border-zinc-100 text-[11px]">
                      <td className="px-2 py-1">{error.rowIndex}</td>
                      <td className="px-2 py-1">{error.type}</td>
                      <td className="px-2 py-1">{error.reason}</td>
                      <td className="px-2 py-1">{error.rowText}</td>
                    </tr>
                  ))}
                  {detailRows.length > 5 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-2 text-xs text-zinc-500">
                        Показаны первые 5 ошибок
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">Ошибок нет</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
