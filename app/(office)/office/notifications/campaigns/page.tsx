export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { listCampaigns } from "@/lib/office/communications.store";
import { hasPgConnection, listDrafts, type NotificationDraft } from "@/lib/office/notifications.pg";
import CampaignsClient from "./CampaignsClient";
import AppLink from "@/components/AppLink";

export default async function OfficeCampaignsPage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff/login?next=/office/notifications/campaigns");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!hasPermission(role, "notifications.manage") && !hasPermission(role, "notifications.send")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const initialItems = hasPgConnection()
    ? (await listDrafts({ type: "campaign" })).map((draft: NotificationDraft) => ({
        id: draft.id,
        name: draft.payload.name,
        templateKey: draft.payload.templateKey,
        channel: draft.payload.channel,
        audience: draft.payload.audience,
        status: draft.status,
        scheduleAt: draft.sendAt,
        createdAt: draft.createdAt,
        stats: { targetedCount: 0, sentCount: 0, failedCount: 0, skippedCount: 0 },
        lastError: null,
      }))
    : listCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Кампании уведомлений</h1>
          <p className="text-sm text-zinc-600">Рассылки по шаблонам с отложенной отправкой</p>
        </div>
        <AppLink
          href="/office/notifications/journal"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          Журнал отправок
        </AppLink>
      </div>
      <CampaignsClient initialItems={initialItems} />
    </div>
  );
}
