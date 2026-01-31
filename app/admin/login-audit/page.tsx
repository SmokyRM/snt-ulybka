import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole } from "@/lib/rbac";
import LoginAuditClient from "./LoginAuditClient";

export default async function LoginAuditPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/login-audit");
  }
  if (!isAdminRole(user.role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/login-audit");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Аудит входов</h1>
          <p className="mt-1 text-sm text-zinc-600">Журнал попыток входа пользователей</p>
        </div>
        <LoginAuditClient />
      </div>
    </main>
  );
}
