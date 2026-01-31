import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import NotificationDraftsClient from "./NotificationDraftsClient";
import OfficeErrorState from "../../_components/OfficeErrorState";

export default async function OfficeNotificationDebtorsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/notifications/debtors");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  if (!hasActionPermission(role, "notifications.send")) {
    return <OfficeErrorState message="Нет доступа к отправке уведомлений (403)." />;
  }

  return <NotificationDraftsClient />;
}
