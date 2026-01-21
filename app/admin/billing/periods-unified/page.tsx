import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import PeriodsUnifiedClient from "./PeriodsUnifiedClient";
import { listUnifiedBillingPeriods } from "@/lib/mockDb";
import AdminHelp from "../../_components/AdminHelp";

export default async function BillingPeriodsUnifiedPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/periods-unified");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/periods-unified");
  }

  const periods = listUnifiedBillingPeriods();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Периоды начислений</h1>
        <p className="text-sm text-zinc-600">
          Единое место для управления периодами начислений (членские, целевые, электроэнергия).
        </p>
      </div>
      <AdminHelp
        title="О периодах начислений"
        content="Периоды начислений объединяют все типы начислений (членские, целевые, электроэнергия) в один период. Создайте период, сгенерируйте начисления и утвердите их для расчёта долгов."
      />
      <PeriodsUnifiedClient initialPeriods={periods} />
    </div>
  );
}
