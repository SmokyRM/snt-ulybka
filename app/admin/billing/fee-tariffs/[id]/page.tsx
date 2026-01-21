import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { findFeeTariffById } from "@/lib/mockDb";
import FeeTariffEditClient from "./FeeTariffEditClient";

export default async function FeeTariffEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/fee-tariffs");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/fee-tariffs");
  }

  const { id } = await params;
  const tariff = findFeeTariffById(id);
  if (!tariff) {
    redirect("/admin/billing/fee-tariffs");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Редактировать тариф</h1>
        <p className="text-sm text-zinc-600">Изменения сохраняются через API.</p>
      </div>
      <FeeTariffEditClient tariff={tariff} />
    </div>
  );
}
