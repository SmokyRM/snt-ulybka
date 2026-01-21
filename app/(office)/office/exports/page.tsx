import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isOfficeRole, hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import BackToListLink from "@/components/BackToListLink";

export default async function OfficeExportsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/exports");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) redirect("/forbidden?reason=office.only&next=/office");
  if (!hasPermission(role, "finance.export")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  return (
    <div className="space-y-4" data-testid="office-exports-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Экспорт данных</h1>
        <p className="text-sm text-zinc-600">Экспорт финансовых и других данных.</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600 shadow-sm">
        <p>Функционал экспорта данных будет доступен в ближайшее время.</p>
        <p className="mt-2">Пока используйте кнопку экспорта в разделе &quot;Финансы&quot;.</p>
      </div>
      <BackToListLink href="/office/dashboard" label="Назад в офис" />
    </div>
  );
}
