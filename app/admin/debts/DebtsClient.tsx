"use client";

import { useAppRouter } from "@/hooks/useAppRouter";
import { useMemo, useState } from "react";
import AppLink from "@/components/AppLink";
import type { DebtTypeFilter } from "@/lib/debts";

type Item = {
  plotId: string;
  street: string;
  number: string;
  ownerName: string;
  debtMembership: number;
  debtTarget: number;
  debtElectricity: number;
  debtTotal: number;
  notificationStatus: string;
  periodId?: string | null;
};

interface Props {
  initialItems: Item[];
  totals: { count: number; sumMembership: number; sumTarget: number; sumElectricity: number; sumTotal: number };
  filters: { period: string; type: DebtTypeFilter; minDebt?: number; q?: string; onlyUnnotified?: boolean };
}

const formatCurrency = (v: number) => `${v.toFixed(2)} ₽`;

export default function DebtsClient({ initialItems, totals, filters }: Props) {
  const router = useAppRouter();
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(filters.period);
  const [type, setType] = useState<DebtTypeFilter>(filters.type);
  const [minDebt, setMinDebt] = useState(filters.minDebt ? String(filters.minDebt) : "");
  const [q, setQ] = useState(filters.q ?? "");
  const [onlyUnnotified, setOnlyUnnotified] = useState(Boolean(filters.onlyUnnotified));

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (period) sp.set("period", period);
    if (type) sp.set("type", type);
    if (minDebt) sp.set("minDebt", minDebt);
    if (q) sp.set("q", q);
    if (onlyUnnotified) sp.set("onlyUnnotified", "1");
    return sp.toString();
  }, [period, type, minDebt, q, onlyUnnotified]);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/debts?${queryString}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Ошибка загрузки");
        return;
      }
      setItems(data.items as Item[]);
      router.push(`/admin/debts?${queryString}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const markStatus = async (item: Item, status: "notified" | "resolved") => {
    if (!item.periodId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications/debtors/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plotId: item.plotId,
          periodId: item.periodId,
          type: type === "electricity" ? "electricity" : "membership",
          debtAmount: item.debtTotal,
          status,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError((data as { error?: string }).error ?? "Ошибка статуса");
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.plotId === item.plotId ? { ...i, notificationStatus: status } : i
        )
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    window.location.href = `/api/admin/debts/export.csv?${queryString}`;
  };
  const exportPdf = () => {
    window.location.href = `/api/admin/debts/pdf?${queryString}`;
  };
  const sendTelegram = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/debts/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          type,
          minDebt: minDebt ? Number(minDebt) : null,
          q,
          onlyUnnotified,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError((data as { error?: string }).error ?? "Ошибка отправки");
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 text-sm md:grid-cols-6 md:items-end">
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-800">Период</span>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="YYYY-MM"
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-800">Тип</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DebtTypeFilter)}
              className="rounded border border-zinc-300 px-3 py-2"
            >
              <option value="all">Все</option>
              <option value="membership">Членские</option>
              <option value="target">Целевые</option>
              <option value="electricity">Электроэнергия</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-800">Мин. долг</span>
            <input
              type="number"
              min={0}
              value={minDebt}
              onChange={(e) => setMinDebt(e.target.value)}
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold text-zinc-800">Поиск</span>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Улица/участок/ФИО"
              className="rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={onlyUnnotified}
              onChange={(e) => setOnlyUnnotified(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-[#5E704F]"
            />
            <span className="inline-flex items-center gap-1">
              Только без закрытых
              <span
                className="cursor-help text-xs text-zinc-400"
                title="Закрытые долги — полностью погашенные"
              >
                ⓘ
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              className="mt-1 rounded bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4f5f42]"
              disabled={loading}
            >
              Обновить
            </button>
          </div>
        </div>
        {error && <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-zinc-700">
        <span>Количество: {totals.count}</span>
        <span>Членские: {formatCurrency(totals.sumMembership)}</span>
        <span>Целевые: {formatCurrency(totals.sumTarget)}</span>
        <span>Электро: {formatCurrency(totals.sumElectricity)}</span>
        <span className="font-semibold">Всего: {formatCurrency(totals.sumTotal)}</span>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <details className="relative">
          <summary className="cursor-pointer rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100">
            Экспорт
          </summary>
          <div className="absolute z-10 mt-2 w-44 rounded-xl border border-zinc-200 bg-white p-2 shadow-md">
            <button
              type="button"
              onClick={exportCsv}
              className="w-full rounded px-3 py-2 text-left text-sm hover:bg-zinc-100"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="w-full rounded px-3 py-2 text-left text-sm hover:bg-zinc-100"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={sendTelegram}
              className="w-full rounded px-3 py-2 text-left text-sm hover:bg-zinc-100"
              disabled={loading}
            >
              Telegram
            </button>
          </div>
        </details>
      </div>

      <div className="overflow-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">ФИО</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Членские</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Целевые</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Электро</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Всего</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Статус</th>
              <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => (
              <tr key={item.plotId} className={item.debtTotal > 0 ? "" : "text-zinc-500"}>
                <td className="px-3 py-2">
                  {item.street}, {item.number}
                </td>
                <td className="px-3 py-2">{item.ownerName}</td>
                <td className="px-3 py-2">{formatCurrency(item.debtMembership)}</td>
                <td className="px-3 py-2">{formatCurrency(item.debtTarget)}</td>
                <td className="px-3 py-2">{formatCurrency(item.debtElectricity)}</td>
                <td className="px-3 py-2 font-semibold">{formatCurrency(item.debtTotal)}</td>
                <td className="px-3 py-2">{item.notificationStatus}</td>
                <td className="px-3 py-2 space-x-2">
                  <AppLink href={`/admin/registry/${item.plotId}`} className="text-[#5E704F] underline">
                    Карточка
                  </AppLink>
                  <button
                    type="button"
                    className="rounded border border-amber-500 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                    onClick={() => markStatus(item, "notified")}
                    disabled={loading}
                  >
                    Уведомлён
                  </button>
                  <button
                    type="button"
                    className="rounded border border-green-600 px-2 py-1 text-xs font-semibold text-green-800 hover:bg-green-50"
                    onClick={() => markStatus(item, "resolved")}
                    disabled={loading}
                  >
                    Закрыть
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-zinc-600" colSpan={8}>
                  Нет данных по текущему фильтру
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
