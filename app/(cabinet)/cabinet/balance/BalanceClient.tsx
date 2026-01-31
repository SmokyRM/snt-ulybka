"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, ApiError } from "@/lib/api/client";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { ErrorState } from "../../../cabinet/_components/ErrorState";
import { LoadingState } from "../../../cabinet/_components/LoadingState";

type BalanceData = {
  totalDebt: number;
  totalPaid: number;
  totalAccrued: number;
  penalty: number;
  periods: Array<{
    period: string;
    accrued: number;
    paid: number;
    debt: number;
  }>;
};

type Props = {
  headerInfo: {
    title: string;
    statusLine: string;
    progressLabel: string | null;
    progressHref: string | null;
  };
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default function BalanceClient({ headerInfo }: Props) {
  const [data, setData] = useState<BalanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<BalanceData>("/api/cabinet/balance");
      setData(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось загрузить баланс";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isEmpty =
    data &&
    data.totalAccrued === 0 &&
    data.totalPaid === 0 &&
    data.periods.length === 0;

  return (
    <div className="space-y-6" data-testid="cabinet-balance-root">
      <CabinetHeader
        title={headerInfo.title}
        statusLine={headerInfo.statusLine}
        progressLabel={headerInfo.progressLabel}
        progressHref={headerInfo.progressHref}
      />

      {loading ? <LoadingState lines={5} /> : null}
      {error ? (
        <ErrorState title="Не удалось загрузить баланс" description={error} actionHref="/cabinet/balance" />
      ) : null}
      {!loading && !error && isEmpty ? (
        <EmptyState
          title="Данных по начислениям пока нет"
          description="Когда появятся начисления и оплаты, мы покажем баланс здесь."
          actionHref="/cabinet/payments"
          actionLabel="Перейти к взносам"
        />
      ) : null}

      {!loading && !error && data && !isEmpty ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CabinetCard title="Долг" subtitle="Текущий баланс">
            <div className="text-2xl font-semibold text-zinc-900" data-testid="cabinet-balance-total-debt">
              {formatCurrency(data.totalDebt)}
            </div>
            <p className="mt-2 text-xs text-zinc-500">Сумма начислений минус оплаты.</p>
          </CabinetCard>
          <CabinetCard title="Начислено / оплачено" subtitle="Сводка по периоду">
            <div className="space-y-1 text-sm text-zinc-700">
              <div className="flex items-center justify-between">
                <span>Начислено</span>
                <span className="font-semibold">{formatCurrency(data.totalAccrued)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Оплачено</span>
                <span className="font-semibold">{formatCurrency(data.totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Пени</span>
                <span className="font-semibold">{formatCurrency(data.penalty)}</span>
              </div>
            </div>
          </CabinetCard>
        </div>
      ) : null}

      {!loading && !error && data && data.periods.length > 0 ? (
        <CabinetCard title="История по периодам" subtitle="Последние начисления">
          <div className="divide-y divide-zinc-100 text-sm">
            {data.periods.map((item) => (
              <div key={item.period} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-semibold text-zinc-800">{item.period}</div>
                  <div className="text-xs text-zinc-500">
                    Начислено {formatCurrency(item.accrued)} • Оплачено {formatCurrency(item.paid)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-zinc-900">{formatCurrency(item.debt)}</div>
              </div>
            ))}
          </div>
        </CabinetCard>
      ) : null}
    </div>
  );
}
