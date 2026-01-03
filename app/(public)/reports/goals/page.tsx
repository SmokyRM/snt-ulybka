import Link from "next/link";
import { listTargetFundsWithStats } from "@/lib/targets";

export const metadata = {
  alternates: {
    canonical: "/reports/goals",
  },
};

const formatAmount = (n: number) => `${n.toFixed(2)} ₽`;

export default function PublicGoalsPage() {
  const funds = listTargetFundsWithStats(false).sort((a, b) => {
    if (a.status === b.status) {
      return (b.remaining ?? 0) - (a.remaining ?? 0);
    }
    if (a.status === "active") return -1;
    if (b.status === "active") return 1;
    return 0;
  });
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Цели и целевые сборы</h1>
          <p className="text-sm text-zinc-700">
            Публичная информация о целевых взносах. Персональные данные не публикуются. Данные обновляются при загрузке
            страницы.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {funds.map((f) => {
            const progressPct = Math.min(Math.floor((f.collected / f.targetAmount) * 100), 100);
            const remaining = Math.max(f.targetAmount - f.collected, 0);
            return (
              <div key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">{f.title}</h2>
                    <p className="text-xs uppercase tracking-[0.08em] text-[#5E704F]">{f.status}</p>
                  </div>
                  <div className="text-right text-sm text-zinc-700">
                    <div>Цель: {formatAmount(f.targetAmount)}</div>
                    <div>Собрано: {formatAmount(f.collected)}</div>
                    <div>Осталось: {formatAmount(remaining)}</div>
                  </div>
                </div>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">{f.description}</p>
                <div className="space-y-1">
                  <div className="w-full rounded-full bg-zinc-100">
                    <div
                      className="rounded-full bg-[#5E704F] text-xs text-white"
                      style={{ width: `${progressPct}%`, minWidth: "4%" }}
                    >
                      &nbsp;
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600">Прогресс: {progressPct}%</div>
                </div>
              </div>
            );
          })}
          {funds.length === 0 && <div className="text-sm text-zinc-700">Активных целей пока нет.</div>}
        </div>
        <Link href="/reports" className="text-[#5E704F] underline">
          Назад к отчетам
        </Link>
      </div>
    </main>
  );
}
