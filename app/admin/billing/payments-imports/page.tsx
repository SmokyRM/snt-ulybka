import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import PaymentsImportsJournalClient from "./PaymentsImportsJournalClient";

export default async function PaymentsImportsJournalPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/billing/payments-imports");
  }
  if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
    redirect("/forbidden?reason=finance.access&next=/admin/billing/payments-imports");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Журнал импортов платежей</h1>
        <p className="text-sm text-zinc-600">
          История всех импортов платежей с результатами обработки и ошибками.
        </p>
      </div>
      <PaymentsImportsJournalClient />
    </div>
  );
}
