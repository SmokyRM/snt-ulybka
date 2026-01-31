"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiGet, ApiError } from "@/lib/api/client";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { ErrorState } from "../../../cabinet/_components/ErrorState";
import { LoadingState } from "../../../cabinet/_components/LoadingState";

type ReceiptPeriod = {
  period: string;
  accrued: number;
  paid: number;
  debt: number;
  downloadUrl: string;
};

type ReceiptsData = {
  periods: ReceiptPeriod[];
  count: number;
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

export default function ReceiptsClient({ headerInfo }: Props) {
  const [data, setData] = useState<ReceiptsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<ReceiptsData>("/api/cabinet/receipts");
      setData(result);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Не удалось загрузить квитанции";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const periods = useMemo(() => data?.periods ?? [], [data]);

  return (
    <div className="space-y-6" data-testid="cabinet-receipts-root">
      <CabinetHeader
        title={headerInfo.title}
        statusLine={headerInfo.statusLine}
        progressLabel={headerInfo.progressLabel}
        progressHref={headerInfo.progressHref}
      />

      {loading ? <LoadingState lines={4} /> : null}
      {error ? (
        <ErrorState title="Не удалось загрузить квитанции" description={error} actionHref="/cabinet/receipts" />
      ) : null}

      {!loading && !error && periods.length === 0 ? (
        <EmptyState
          title="Квитанций пока нет"
          description="Когда появятся начисления, мы сформируем квитанции за нужные периоды."
          actionHref="/cabinet/payments"
          actionLabel="Перейти к взносам"
        />
      ) : null}

      {!loading && !error && periods.length > 0 ? (
        <CabinetCard title="Квитанции" subtitle="По расчетным периодам">
          <div className="divide-y divide-zinc-100 text-sm">
            {periods.map((period) => (
              <div
                key={period.period}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
                data-testid={`cabinet-receipts-row-${period.period}`}
              >
                <div>
                  <div className="font-semibold text-zinc-900">{period.period}</div>
                  <div className="text-xs text-zinc-500">
                    Начислено {formatCurrency(period.accrued)} • Оплачено {formatCurrency(period.paid)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-zinc-900">{formatCurrency(period.debt)}</div>
                  <a
                    href={period.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[#5E704F]/60 px-3 py-1 text-xs font-semibold text-[#2F3827] transition hover:border-[#5E704F]"
                    data-testid={`cabinet-receipts-download-${period.period}`}
                  >
                    Скачать
                  </a>
                </div>
              </div>
            ))}
          </div>
        </CabinetCard>
      ) : null}
    </div>
  );
}
