import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import ExpensesClient from "../../../admin/expenses/ExpensesClient";

export default async function OfficeExpensesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/expenses");
  }

  const role = user.role;
  if (!isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=office.only&next=/office/expenses");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Расходы</h1>
        </div>
        <ExpensesClient />
      </div>
    </main>
  );
}
