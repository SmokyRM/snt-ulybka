import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import FeeTariffsClient from "./FeeTariffsClient";
import { listFeeTariffs } from "@/lib/mockDb";

export default async function FeeTariffsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/fee-tariffs");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/fee-tariffs");
  }

  const tariffs = listFeeTariffs();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Тарифы взносов</h1>
        <p className="text-sm text-zinc-600">
          Управление тарифами для начислений. Тарифы определяют сумму взносов, которые начисляются участкам.
        </p>
      </div>
      <FeeTariffsClient initialTariffs={tariffs} />
    </div>
  );
}
