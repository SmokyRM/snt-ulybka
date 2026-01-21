"use client";

import { useState } from "react";
import { formatAdminTime } from "@/lib/settings.shared";
import type { DebtNotification } from "@/types/snt";
import { readOk } from "@/lib/api/client";

interface Props {
  plotId: string;
  notifications: DebtNotification[];
}

export function NotificationStatusActions({ plotId, notifications }: Props) {
  const [items, setItems] = useState<DebtNotification[]>(notifications);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = async (notif: DebtNotification, status: "notified" | "resolved") => {
    setLoadingId(notif.periodId + notif.type);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/debtors/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId,
          periodId: notif.periodId,
          type: notif.type,
          debtAmount: notif.debtAmount,
          status,
        }),
      });
      const data = await readOk<{ notification?: DebtNotification }>(res);
      const updated = data.notification ?? notif;
      setItems((prev) =>
        prev.map((n) =>
          n.periodId === notif.periodId && n.type === notif.type ? { ...n, ...updated } : n
        )
      );
    } catch (e) {
      setError((e as Error).message || "Ошибка");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="overflow-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Период</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Тип</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Долг</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Статус</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Комментарий</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Обновлено</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((n) => (
              <tr key={`${n.periodId}-${n.type}`}>
                <td className="px-3 py-2">{n.periodId}</td>
                <td className="px-3 py-2">{n.type}</td>
                <td className="px-3 py-2">{n.debtAmount.toFixed(2)} ₽</td>
                <td className="px-3 py-2">{n.status}</td>
                <td className="px-3 py-2">{n.comment ?? "—"}</td>
                <td className="px-3 py-2">{n.updatedAt ? formatAdminTime(n.updatedAt) : "—"}</td>
                <td className="px-3 py-2 space-x-2">
                  <button
                    type="button"
                    className="rounded border border-amber-500 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    disabled={loadingId === n.periodId + n.type}
                    onClick={() => updateStatus(n, "notified")}
                  >
                    Отметить уведомлён
                  </button>
                  <button
                    type="button"
                    className="rounded border border-green-600 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
                    disabled={loadingId === n.periodId + n.type}
                    onClick={() => updateStatus(n, "resolved")}
                  >
                    Закрыть
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-zinc-600" colSpan={7}>
                  Уведомлений нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
