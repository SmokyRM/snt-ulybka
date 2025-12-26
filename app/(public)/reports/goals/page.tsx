import Link from "next/link";
import { listTargetFundsWithStats } from "@/lib/targets";

const formatAmount = (n: number) => `${n.toFixed(2)} ₽`;

export default function PublicGoalsPage() {
  const funds = listTargetFundsWithStats(true);
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Цели и целевые сборы</h1>
          <p className="text-sm text-zinc-700">Публичная информация о целевых взносах. Личные данные не публикуются.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {funds.map((f) => {
            const progressPct = Math.min(Math.floor((f.collected / f.targetAmount) * 100), 100);
            return (
              <div key={f.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-2">
                <h2 className="text-lg font-semibold text-zinc-900">{f.title}</h2>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">{f.description}</p>
                <div className="text-sm text-zinc-800">
                  Цель: {formatAmount(f.targetAmount)} | Собрано: {formatAmount(f.collected)} | Осталось:{" "}
                  {formatAmount(Math.max(f.targetAmount - f.collected, 0))}
                </div>
                <div className="w-full rounded-full bg-zinc-100">
                  <div
                    className="rounded-full bg-[#5E704F] text-xs text-white"
                    style={{ width: `${progressPct}%`, minWidth: "4%" }}
                  >
                    &nbsp;
                  </div>
                </div>
                <div className="text-xs text-zinc-600">Прогресс: {progressPct}%</div>
                <div className="text-xs text-zinc-600">Статус: {f.status}</div>
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
