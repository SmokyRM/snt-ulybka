import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { getTargetFundWithStats, getTargetFundTimeline } from "@/lib/targets";

const formatAmount = (n: number) => `${n.toFixed(2)} ₽`;

export default async function TargetFundDetail({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");

  const fund = getTargetFundWithStats(params.id);
  if (!fund) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Цель не найдена</h1>
          <Link href="/admin/targets" className="text-[#5E704F] underline">
            Вернуться
          </Link>
        </div>
      </main>
    );
  }

  const progressPct = Math.min(Math.floor((fund.collected / fund.targetAmount) * 100), 100);
  const timeline = getTargetFundTimeline(fund.id);
  const hasSpent = timeline.spent.length > 0;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{fund.title}</h1>
          <Link
            href="/admin/targets"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{fund.description}</p>
          <div className="space-y-2 text-sm text-zinc-800">
            <div>Статус: {fund.status}</div>
            <div>Цель: {formatAmount(fund.targetAmount)}</div>
            <div>Собрано: {formatAmount(fund.collected)}</div>
            <div>Расходы: {formatAmount(fund.spent)}</div>
            <div>Осталось: {formatAmount(Math.max(fund.targetAmount - fund.collected, 0))}</div>
            {hasSpent && <div>Баланс в рамках цели: {formatAmount(fund.collected - fund.spent)}</div>}
          </div>
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

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold">Собрано по месяцам</h2>
          <div className="flex flex-wrap items-end gap-3 text-sm">
            {timeline.collected.length === 0 && <div className="text-zinc-600">Нет данных о платежах</div>}
            {timeline.collected.length > 0 && (
              <div className="flex flex-1 items-end gap-2">
                {timeline.collected.map((p) => {
                  const max = Math.max(...timeline.collected.map((c) => c.amount), 1);
                  const h = (p.amount / max) * 120;
                  return (
                    <div key={p.month} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded bg-[#5E704F]" style={{ height: `${h}px` }} />
                      <div className="text-[11px] text-zinc-600">{p.month}</div>
                      <div className="text-[11px] text-zinc-700">{p.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {hasSpent && (
            <div className="space-y-1 text-sm text-zinc-800">
              <div className="font-semibold">Потрачено по месяцам</div>
              <div className="flex flex-wrap items-end gap-2">
                {timeline.spent.map((p) => {
                  const max = Math.max(...timeline.spent.map((c) => c.amount), 1);
                  const h = (p.amount / max) * 120;
                  return (
                    <div key={`spent-${p.month}`} className="flex flex-col items-center gap-1">
                      <div className="w-10 rounded bg-amber-500" style={{ height: `${h}px` }} />
                      <div className="text-[11px] text-zinc-600">{p.month}</div>
                      <div className="text-[11px] text-zinc-700">{p.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
