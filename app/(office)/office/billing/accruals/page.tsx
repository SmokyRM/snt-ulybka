import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { listAccrualsWithStatus } from "@/lib/billing.store";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(value);

export default async function OfficeBillingAccrualsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/accruals");
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

  const rows = listAccrualsWithStatus();

  return (
    <div className="space-y-4" data-testid="office-billing-accruals-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Начисления</h1>
        <p className="text-sm text-zinc-600">Последние начисления по участкам.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
            Начислений пока нет.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Дата</th>
                  <th className="px-3 py-2 text-left">Участок</th>
                  <th className="px-3 py-2 text-left">Тип</th>
                  <th className="px-3 py-2 text-right">Начислено</th>
                  <th className="px-3 py-2 text-right">Оплачено</th>
                  <th className="px-3 py-2 text-right">Остаток</th>
                  <th className="px-3 py-2 text-left">Статус</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((row) => (
                  <tr key={row.id} data-testid={`office-billing-accruals-row-${row.id}`}>
                    <td className="px-3 py-2 text-zinc-700">{new Date(row.date).toLocaleDateString("ru-RU")}</td>
                    <td className="px-3 py-2 text-zinc-900">{row.plotId}</td>
                    <td className="px-3 py-2 text-zinc-700">{row.title}</td>
                    <td className="px-3 py-2 text-right font-semibold text-zinc-900">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.paidAmount ?? 0)}</td>
                    <td className="px-3 py-2 text-right text-zinc-700">{formatCurrency(row.remaining ?? 0)}</td>
                    <td className="px-3 py-2 text-zinc-700">{row.status}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      <a
                        href={`/office/billing/allocate`}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                      >
                        Распределения
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
