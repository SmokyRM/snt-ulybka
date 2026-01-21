import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import ExpensesClient from "./ExpensesClient";
import AdminHelp from "../_components/AdminHelp";

export default async function ExpensesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/expenses");
  }
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/expenses");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Расходы</h1>
          <a
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <AdminHelp
          title="О расходах"
          content="Ведите учёт всех расходов СНТ по категориям. Каждый расход можно привязать к целевой программе. Используйте фильтры для поиска и экспорт для отчётов."
        />
        <ExpensesClient />
      </div>
    </main>
  );
}
