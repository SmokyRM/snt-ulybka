import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { isAdminRole } from "@/lib/rbac";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/users");
  }
  if (!isAdminRole(user.role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/users");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6" data-testid="admin-users-root">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Пользователи</h1>
          <p className="mt-1 text-sm text-zinc-600">Управление ролями и доступом</p>
        </div>
        <UsersClient />
      </div>
    </main>
  );
}
