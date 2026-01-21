import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import TargetFundFormClient from "../TargetFundFormClient";

export default async function NewTargetFundPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/targets/new");
  }
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/targets/new");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Создать цель</h1>
          <Link
            href="/admin/targets"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>
        <TargetFundFormClient />
      </div>
    </main>
  );
}
