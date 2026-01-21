import { redirect } from "next/navigation";
import AppLink from "@/components/AppLink";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";

export default async function OfficeSettingsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/settings");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Настройки</h1>
          <p className="text-sm text-zinc-600">Управление настройками системы.</p>
        </div>

        <div className="space-y-3">
          <AppLink
            href="/office/settings/notifications"
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition hover:bg-zinc-50"
          >
            <div>
              <div className="font-semibold text-zinc-900">Уведомления</div>
              <div className="text-sm text-zinc-600">Настройка Telegram уведомлений</div>
            </div>
            <span className="text-zinc-400">→</span>
          </AppLink>
        </div>
      </div>
    </div>
  );
}
