import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { findTargetFundById } from "@/lib/mockDb";
import TargetFundFormClient from "../../TargetFundFormClient";

export default async function EditTargetFundPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/staff-login?next=/admin/targets");
  }
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    redirect("/forbidden?reason=admin.only&next=/admin/targets");
  }

  const { id } = await params;
  const fund = findTargetFundById(id);
  if (!fund) {
    redirect("/admin/targets");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Редактировать цель</h1>
          <a
            href={`/admin/targets/${id}`}
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </a>
        </div>
        <TargetFundFormClient initialData={fund} />
      </div>
    </main>
  );
}
