import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { listUnifiedBillingPeriods, listPlots, listFeeTariffs, listPeriodAccruals } from "@/lib/mockDb";
import EmptyStateCard from "@/components/EmptyStateCard";
import AccrualsClient from "./AccrualsClient";

export default async function AccrualsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/staff-login?next=/admin/billing/accruals");
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=billing&next=/admin/billing/accruals");
  }

  const plots = listPlots();
  if (plots.length === 0) {
    return (
      <div className="space-y-6" data-testid="accruals-root">
        <h1 className="text-2xl font-semibold text-zinc-900">Начисления</h1>
        <EmptyStateCard
          title="Пустой реестр"
          description="Добавьте участки в реестр, чтобы считать начисления."
          actionLabel="Реестр"
          actionHref="/admin/registry"
        />
      </div>
    );
  }

  const allTariffs = listFeeTariffs().filter((t) => t.status !== "draft");
  if (allTariffs.length === 0) {
    return (
      <div className="space-y-6" data-testid="accruals-root">
        <h1 className="text-2xl font-semibold text-zinc-900">Начисления</h1>
        <EmptyStateCard
          title="Нет тарифов"
          description="Создайте тариф взносов (активный), чтобы генерировать начисления."
          actionLabel="Тарифы"
          actionHref="/admin/billing/fee-tariffs"
        />
      </div>
    );
  }

  const all = listUnifiedBillingPeriods();
  const periodsWithSummary = all.map((p) => {
    const acc = listPeriodAccruals(p.id);
    return {
      ...p,
      accrualsCount: acc.length,
      totalAccrued: acc.reduce((s, a) => s + a.amountAccrued, 0),
      totalPaid: acc.reduce((s, a) => s + (a.amountPaid ?? 0), 0),
    };
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Начисления</h1>
        <p className="text-sm text-zinc-600">
          Создайте период, в карточке периода: «Предпросмотр» и «Применить».
        </p>
      </div>
      <AccrualsClient initialPeriods={periodsWithSummary} />
    </div>
  );
}
