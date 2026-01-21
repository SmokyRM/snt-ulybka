import { redirect } from "next/navigation";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import ImportsJournalClient from "./ImportsJournalClient";

export default async function ImportsJournalPage() {
  const user = await getSessionUser();
  if (!hasFinanceAccess(user)) {
    redirect("/staff-login?next=/admin/billing/imports");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Журнал импортов платежей</h1>
        <p className="text-sm text-zinc-600">
          История всех импортов платежей с результатами обработки и ошибками.
        </p>
      </div>
      <ImportsJournalClient />
    </div>
  );
}