import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import AccrualsByPeriodClient from "./AccrualsByPeriodClient";
import { getPeriod } from "@/lib/billing/core";

export default async function AccrualsByPeriodPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) {
    redirect("/staff-login?next=/admin/billing/periods");
  }

  const { periodId } = await params;
  const period = getPeriod(periodId);

  if (!period) {
    redirect("/admin/billing/periods");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Начисления за {period.year}-{String(period.month).padStart(2, "0")}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Формирование начислений на основе активных тарифов. Начисления создаются для каждого участка.
            </p>
          </div>
          <a
            href="/admin/billing/periods"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            ← Назад к периодам
          </a>
        </div>
      </div>
      <AccrualsByPeriodClient periodId={periodId} period={period} />
    </div>
  );
}