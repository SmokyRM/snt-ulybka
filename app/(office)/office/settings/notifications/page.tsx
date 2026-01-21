import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { getUserNotificationPrefs } from "@/server/services/notifications";
import NotificationsClient from "./NotificationsClient";

export default async function OfficeNotificationsSettingsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/settings/notifications");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const prefs = getUserNotificationPrefs(user.id);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-notifications-settings">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Уведомления</h1>
          <p className="text-sm text-zinc-600">Настройка уведомлений через Telegram.</p>
        </div>

        <NotificationsClient initialPrefs={prefs} />
      </div>
    </div>
  );
}
