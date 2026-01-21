import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import DebtsClient from "./DebtsClient";

export default async function DebtsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/debts");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/debts");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Долги по участкам</h1>
        <p className="text-sm text-zinc-600">
          Долг = начислено − оплачено. Фильтры, сортировка и экспорт — в панели ниже.
        </p>
      </div>
      <DebtsClient />
    </div>
  );
}
