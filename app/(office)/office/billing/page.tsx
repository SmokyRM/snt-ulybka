import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import { getOfficeSummary, listDebts } from "@/lib/billing.store";
import AppLink from "@/components/AppLink";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default async function OfficeBillingPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  try {
    assertCan(role, "finance.read", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const summary = getOfficeSummary();
  const debts = listDebts();
  const topDebtors = debts.slice(0, 5);
  const today = new Date().toISOString().slice(0, 10);
  const canExport = hasActionPermission(role, "billing.export");
  const canImport = hasActionPermission(role, "billing.import");
  const canImportExcel = hasActionPermission(role, "billing.import.excel");
  const canImportStatement = hasActionPermission(role, "billing.import_statement");
  const canGenerate = hasActionPermission(role, "billing.generate");
  const canPenalty = hasActionPermission(role, "billing.penalty.apply") || hasActionPermission(role, "billing.penalty.recalc");
  const canViewDebtors = hasActionPermission(role, "billing.view_debtors");

  return (
    <div className="space-y-4" data-testid="office-billing-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Биллинг</h1>
          <p className="text-sm text-zinc-600">Обзор начислений и оплат</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppLink
            href="/office/billing/accruals"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Начисления
          </AppLink>
          {canGenerate && (
            <AppLink
              href="/office/billing/accruals/generate"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Генератор начислений
            </AppLink>
          )}
          <AppLink
            href="/office/billing/payments"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Оплаты
          </AppLink>
          {canImport && (
            <AppLink
              href="/office/billing/import"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Импорт CSV
            </AppLink>
          )}
          {canImportExcel && (
            <AppLink
              href="/office/billing/import-excel"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Импорт Excel
            </AppLink>
          )}
          {canImportStatement && (
            <AppLink
              href="/office/billing/import/statement"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Импорт выписки
            </AppLink>
          )}
          <AppLink
            href="/office/billing/reconcile"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Сверка платежей
          </AppLink>
          <AppLink
            href="/office/billing/allocate"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Распределение
          </AppLink>
          {canPenalty && (
            <AppLink
              href="/office/billing/penalty"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Пени (отчёт)
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/debtors.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
              data-testid="office-billing-export-debtors"
            >
              Экспорт должников
            </AppLink>
          )}
          {canViewDebtors && (
            <AppLink
              href="/office/billing/debtors"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Должники
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/reports/payments.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Экспорт оплат
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/reports/accruals.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Экспорт начислений
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href={`/api/office/billing/reports/penalty.csv?asOf=${today}`}
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Экспорт пени
            </AppLink>
          )}
        </div>
      </div>

      <div
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        data-testid="office-billing-export-root"
      >
        <div className="text-sm font-semibold text-zinc-900">Экспорт</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canExport && (
            <AppLink
              href="/api/office/billing/debtors.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Должники
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/reports/accruals.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Начисления
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/reports/payments.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Оплаты
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href={`/api/office/billing/reports/penalty.csv?asOf=${today}`}
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Пени
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/reports/unallocated-payments.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Нераспределённые
            </AppLink>
          )}
          {canExport && (
            <AppLink
              href="/api/office/billing/reports/overpayments.csv"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Переплаты
            </AppLink>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-600">Общий долг</div>
          <div className="mt-1 text-2xl font-bold text-rose-600">{formatCurrency(summary.totalDebt)}</div>
          <div className="mt-1 text-xs text-zinc-500">{summary.debtorsCount} должников</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-600">Собрано за 30 дней</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(summary.collected30d)}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-zinc-600">Топ должников</div>
          <div className="mt-1 text-sm text-zinc-600">Список самых больших долгов</div>
        </div>
      </div>

      <div
        className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        data-testid="office-billing-top-debtors"
      >
        <div className="text-sm font-semibold text-zinc-900">Должники</div>
        {canViewDebtors && (
          <div className="mt-1 text-xs text-zinc-500">
            <AppLink href="/office/billing/debtors" className="underline">
              Открыть полный список
            </AppLink>
          </div>
        )}
        <div className="mt-3 overflow-x-auto">
          {topDebtors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
              Данных о должниках пока нет.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-left">Владелец</th>
                  <th className="px-3 py-2 text-right">Долг</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {topDebtors.map((row) => (
                  <tr key={row.key}>
                    <td className="px-3 py-2 text-zinc-900">{row.plotId}</td>
                    <td className="px-3 py-2 text-zinc-700">{row.residentName}</td>
                    <td className="px-3 py-2 text-right font-semibold text-rose-600">
                      {formatCurrency(row.debt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
