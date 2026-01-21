import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import DebtorsClient from "./DebtorsClient";

export default async function DebtorsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/debtors");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/debtors");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Должники</h1>
        <p className="text-sm text-zinc-600">
          Сегментация по телефону, просрочке и сумме долга. Формирование рассылки по шаблонам из раздела Уведомления.
        </p>
      </div>
      <DebtorsClient />
    </div>
  );
}
