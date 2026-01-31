"use client";

import { useState } from "react";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";

type HeaderInfo = {
  statusLine?: string;
  progressLabel?: string | null;
  progressHref?: string | null;
};

type AccrualItem = {
  id: string;
  period: string;
  description: string;
  amount: number;
  status: string;
  dueDate?: string;
  docRef?: string;
  plotRef?: string;
  items?: Array<{ title: string; amount: number }>;
};

type PaymentItem = { id: string; date: string; amount: number; method: string; comment?: string | null };

type PaymentsData = {
  accruals: AccrualItem[];
  summary: { debt: number; overpay: number; balance: number; lastPayment: string | null };
  payments: PaymentItem[];
  years: number[];
};

type PaymentsMock = {
  payments?: Omit<PaymentsData, "years">;
} | null;

type Props = {
  mockEnabled: boolean;
  mock: PaymentsMock;
  headerInfo: HeaderInfo;
  data: PaymentsData | null;
};

const getYears = (accruals: AccrualItem[], payments: PaymentItem[]) => {
  const years = new Set<number>();
  accruals.forEach((a) => {
    const year = Number(a.period?.slice(0, 4));
    if (!Number.isNaN(year)) years.add(year);
  });
  payments.forEach((p) => {
    const year = new Date(p.date).getFullYear();
    if (!Number.isNaN(year)) years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
};

export default function PaymentsClient({ mockEnabled, mock, headerInfo, data }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const display = (() => {
    if (mockEnabled && mock?.payments) {
      return {
        ...mock.payments,
        years: getYears(mock.payments.accruals, mock.payments.payments),
      };
    }
    return data;
  })();

  const years = display?.years ?? [];
  const [selectedYear, setSelectedYear] = useState<string>(() => (years[0] ? String(years[0]) : "all"));

  const accruals = display?.accruals ?? [];
  const payments = display?.payments ?? [];
  const summary = display?.summary;

  const openAccrual = (id: string) => {
    if (!accruals.length) return;
    setOpenId(id);
  };

  const active = accruals.find((a) => a.id === openId) || null;
  const filteredAccruals =
    selectedYear === "all"
      ? accruals
      : accruals.filter((a) => a.period?.startsWith(selectedYear));
  const filteredPayments =
    selectedYear === "all"
      ? payments
      : payments.filter((p) => String(new Date(p.date).getFullYear()) === selectedYear);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <CabinetHeader
        title="Взносы"
        statusLine={headerInfo.statusLine}
        progressLabel={headerInfo.progressLabel}
        progressHref={headerInfo.progressHref}
      />

      {summary ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <CabinetCard title="Долг" subtitle="Текущий баланс">
            <div className="text-2xl font-semibold text-rose-700">{summary.debt} ₽</div>
            <div className="text-xs text-zinc-600">Переплата: {summary.overpay} ₽</div>
          </CabinetCard>
          <CabinetCard title="Баланс" subtitle="Долг/переплата">
            <div className="text-2xl font-semibold text-zinc-900">{summary.balance} ₽</div>
            <div className="text-xs text-zinc-600">
              Последняя оплата:{" "}
              {summary.lastPayment
                ? new Date(summary.lastPayment).toLocaleDateString("ru-RU")
                : "—"}
            </div>
          </CabinetCard>
          <CabinetCard title="Фильтр" subtitle="Период">
            <select
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
            >
              <option value="all">Все годы</option>
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </CabinetCard>
        </div>
      ) : null}

      <CabinetCard title="Начисления" subtitle="Последние начисления">
        {filteredAccruals.length ? (
          <div className="divide-y divide-zinc-100 text-sm text-zinc-800">
            {filteredAccruals.map((acc) => (
              <button
                type="button"
                key={acc.id}
                onClick={() => openAccrual(acc.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 py-2 text-left hover:bg-amber-50"
              >
                <div>
                  <div className="font-semibold">{acc.period}</div>
                  <div className="text-xs text-zinc-600">{acc.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{acc.amount} ₽</div>
                  <div className="text-xs text-zinc-600">{acc.status === "paid" ? "Оплачено" : "К оплате"}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Начислений пока нет"
            description="Когда появятся начисления, они отобразятся здесь."
            actionHref="/cabinet"
            actionLabel="На главную"
          />
        )}
      </CabinetCard>

      <CabinetCard title="Оплаты" subtitle="История оплат">
        {filteredPayments.length ? (
          <div className="divide-y divide-zinc-100 text-sm text-zinc-800">
            {filteredPayments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <div className="font-semibold">
                    {new Date(p.date).toLocaleDateString("ru-RU")} · {p.method}
                  </div>
                  {p.comment ? <div className="text-xs text-zinc-600">{p.comment}</div> : null}
                </div>
                <div className="text-sm font-semibold text-emerald-700">+{p.amount} ₽</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Оплат пока нет"
            description="Когда появятся оплаты, они покажутся здесь."
            actionHref="/cabinet"
            actionLabel="На главную"
          />
        )}
      </CabinetCard>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpenId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{active.period}</div>
                <div className="text-xl font-semibold text-zinc-900">{active.description}</div>
                <div className="text-sm text-zinc-600">{active.plotRef ?? "Участок"}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-zinc-900">{active.amount} ₽</div>
                <div className="text-xs text-zinc-600">{active.status === "paid" ? "Оплачено" : "К оплате"}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-zinc-700">
              {active.dueDate ? <div>Срок оплаты: {new Date(active.dueDate).toLocaleDateString("ru-RU")}</div> : null}
              {active.docRef ? <div>Документ: {active.docRef}</div> : null}
            </div>
            {active.items?.length ? (
              <div className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Расшифровка</div>
                {active.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>{item.title}</span>
                    <span className="font-semibold">{item.amount} ₽</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
              >
                Перейти к оплате
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
