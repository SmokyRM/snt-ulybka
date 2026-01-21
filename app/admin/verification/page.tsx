import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import VerificationClient from "./VerificationClient";

export default async function VerificationPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/verification");
  }

  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/verification");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Верификация жителей</h1>
            <p className="mt-1 text-sm text-zinc-600">Подтверждение регистрации новых пользователей</p>
          </div>
        </div>
        <VerificationClient />
      </div>
    </main>
  );
}
