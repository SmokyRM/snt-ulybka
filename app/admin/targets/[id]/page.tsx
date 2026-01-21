import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { getTargetFundWithStats, getTargetFundTimeline } from "@/lib/targets";
import BackToListLink from "@/components/BackToListLink";
import TargetFundDetailClient from "./TargetFundDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TargetFundDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/staff-login?next=/admin/targets");
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/targets");
  }

  const { id } = await params;
  const fund = getTargetFundWithStats(id);
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

  const timeline = getTargetFundTimeline(fund.id);
  
  // Get payments linked to this target fund
  const { listPayments, findPlotById } = await import("@/lib/mockDb");
  const payments = listPayments({ includeVoided: false })
    .filter((p) => p.targetFundId === id)
    .map((p) => {
      const plot = findPlotById(p.plotId);
      return {
        id: p.id,
        amount: p.amount,
        paidAt: p.paidAt,
        plotStreet: plot?.street,
        plotNumber: plot?.plotNumber,
        ownerFullName: plot?.ownerFullName,
      };
    })
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{fund.title}</h1>
          <BackToListLink href="/admin/targets" />
        </div>

        <TargetFundDetailClient fund={fund} payments={payments} />

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
          {timeline.spent.length > 0 && (
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
