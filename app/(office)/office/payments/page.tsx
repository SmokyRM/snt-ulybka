import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isOfficeRole, hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import BackToListLink from "@/components/BackToListLink";

export default async function OfficePaymentsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/payments");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) redirect("/forbidden?reason=office.only&next=/office");
  if (!hasPermission(role, "finance.view")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  return (
    <div className="space-y-4" data-testid="office-payments-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Платежи</h1>
        <p className="text-sm text-zinc-600">Раздел в разработке. Здесь будет управление платежами.</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600 shadow-sm">
        <p>Функционал импорта и обработки платежей будет доступен в ближайшее время.</p>
        <p className="mt-2">Пока используйте раздел &quot;Финансы&quot; для просмотра долгов и оплат.</p>
      </div>
      <BackToListLink href="/office/dashboard" label="Назад в офис" />
    </div>
  );
}
