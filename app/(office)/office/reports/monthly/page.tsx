import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { buildMonthlyReport } from "@/lib/office/reporting";
import MonthlyReportActionsClient from "./MonthlyReportActionsClient";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default async function OfficeMonthlyReportPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/reports/monthly");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!(role === "admin" || role === "chairman" || role === "accountant" || hasPermission(role, "billing.export"))) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const period = searchParams?.period ?? new Date().toISOString().slice(0, 7);
  const report = buildMonthlyReport(period);

  return (
    <div className="space-y-6" data-testid="office-monthly-report-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Ежемесячный отчёт</h1>
        <p className="text-sm text-zinc-600">Период: {report.period}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Финансы</div>
          <div className="mt-2 text-sm text-zinc-700">Начислено: {formatCurrency(report.totals.accrued)}</div>
          <div className="mt-1 text-sm text-zinc-700">Оплачено: {formatCurrency(report.totals.paid)}</div>
          <div className="mt-1 text-sm text-zinc-700">Долг: {formatCurrency(report.totals.debt)}</div>
          <div className="mt-1 text-sm text-zinc-700">Пени: {formatCurrency(report.totals.penalty)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Обращения</div>
          <div className="mt-2 text-sm text-zinc-700">Всего: {report.appeals.total}</div>
          <div className="mt-1 text-sm text-zinc-700">Новые: {report.appeals.new}</div>
          <div className="mt-1 text-sm text-zinc-700">В работе: {report.appeals.inProgress}</div>
          <div className="mt-1 text-sm text-zinc-700">Закрытые: {report.appeals.closed}</div>
        </div>
      </div>

      <MonthlyReportActionsClient period={report.period} />

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Категории начислений</div>
        {report.categories.length === 0 ? (
          <div className="mt-2 text-sm text-zinc-600">Нет начислений за период.</div>
        ) : (
          <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            {report.categories.map((cat) => (
              <div key={cat.label} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
                <span>{cat.label}</span>
                <span className="font-semibold">{formatCurrency(cat.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
