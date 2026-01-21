"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api/client";

type StatsData = {
  period: string;
  from: string;
  to: string;
  counts: {
    assistant_opened: number;
    question_asked: number;
    answer_shown: number;
  };
  topRoutes: Array<{ route: string; count: number }>;
  topRoles: Array<{ role: string; count: number }>;
  totalEvents: number;
};

const periodLabels: Record<string, string> = {
  today: "Сегодня",
  "7d": "7 дней",
  "30d": "30 дней",
};

const eventTypeLabels: Record<string, string> = {
  assistant_opened: "Открытий помощника",
  question_asked: "Заданных вопросов",
  answer_shown: "Показанных ответов",
};

export default function AiStatsClient() {
  const [period, setPeriod] = useState<string>("7d");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData(period);
  }, [period]);

  const loadData = async (selectedPeriod: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<StatsData>(`/api/admin/ai/stats?period=${selectedPeriod}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
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

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="text-sm font-semibold text-zinc-700">Период:</span>
        {(["today", "7d", "30d"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              period === p
                ? "border-[#5E704F] bg-[#5E704F] text-white"
                : "border-zinc-200 text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-zinc-500">Всего событий</div>
          <div className="text-3xl font-semibold text-zinc-900">{data.totalEvents}</div>
        </div>
        {Object.entries(data.counts).map(([type, count]) => (
          <div key={type} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">{eventTypeLabels[type] || type}</div>
            <div className="text-3xl font-semibold text-zinc-900">{count}</div>
          </div>
        ))}
      </div>

      {/* Top Routes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Топ маршрутов</h2>
        {data.topRoutes.length === 0 ? (
          <div className="text-sm text-zinc-600">Нет данных</div>
        ) : (
          <div className="space-y-2">
            {data.topRoutes.map((item) => (
              <div key={item.route} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <span className="text-sm font-semibold text-zinc-900">{item.route || "—"}</span>
                <span className="text-sm text-zinc-700">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Roles */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Топ ролей</h2>
        {data.topRoles.length === 0 ? (
          <div className="text-sm text-zinc-600">Нет данных</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.topRoles.map((item) => (
              <div key={item.role} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="text-xs text-zinc-500">{item.role || "—"}</div>
                <div className="text-lg font-semibold text-zinc-900">{item.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        <Link
          href="/admin"
          className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
        >
          Назад
        </Link>
        <Link
          href="/admin/ai-usage"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100"
        >
          Детальная статистика
        </Link>
      </div>
    </div>
  );
}
