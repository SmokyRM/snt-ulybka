export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { listCommunicationLogs } from "@/lib/office/communications.store";
import { hasPgConnection, listJournal, type NotificationJournalRow } from "@/lib/office/notifications.pg";
import JournalClient from "./JournalClient";

export default async function OfficeNotificationsJournalPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff/login?next=/office/notifications/journal");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!hasPermission(role, "notifications.manage") && !hasPermission(role, "notifications.send")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const initialItems = hasPgConnection()
    ? (await listJournal()).map((item: NotificationJournalRow) => ({
        id: item.id,
        userId: item.userId,
        plotId: item.plotId,
        campaignId: item.draftId,
        channel: item.channel,
        templateKey: item.templateKey ?? "—",
        renderedText: item.renderedText ?? "",
        status: item.status,
        sentAt: item.sentAt,
        providerMessageId: null,
        error: item.error,
      }))
    : listCommunicationLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Журнал коммуникаций</h1>
        <p className="text-sm text-zinc-600">История отправленных уведомлений</p>
      </div>
      <JournalClient initialItems={initialItems} />
    </div>
  );
}
