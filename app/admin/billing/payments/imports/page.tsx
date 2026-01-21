import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import ImportsJournalClient from "./ImportsJournalClient";

export default async function PaymentsImportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/staff-login?next=/admin/billing/payments/imports");
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=billing&next=/admin/billing/payments/imports");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Журнал импортов платежей</h1>
        <p className="text-sm text-zinc-600">
          Список импортов: дата, файл, кто, итоги (imported / needs_review / errors). После Apply импорт попадает сюда.
        </p>
      </div>
      <ImportsJournalClient />
    </div>
  );
}
