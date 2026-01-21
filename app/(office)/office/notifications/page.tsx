import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { listNotifications, getUnreadCount } from "@/server/notifications/internal.store";
import NotificationsClient from "./NotificationsClient";

export default async function OfficeNotificationsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/notifications");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  // Получаем уведомления для текущего пользователя
  const notifications = listNotifications({
    userId: user.id ?? null,
    role,
    unreadOnly: false,
    limit: 100, // Показываем последние 100 уведомлений
  });

  const unreadCount = getUnreadCount({
    userId: user.id ?? null,
    role,
  });

  return (
    <NotificationsClient
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
      currentUserId={user.id ?? ""}
    />
  );
}
