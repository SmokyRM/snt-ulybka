export const runtime = "nodejs";

import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { listCampaignsDb } from "@/lib/notifications/campaigns.pg";
import { listTemplates } from "@/lib/notifications/templates.pg";
import CampaignsV2Client from "./CampaignsV2Client";

export default async function CampaignsV2Page() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff/login?next=/office/notifications/campaigns/v2");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) redirect("/forbidden");
  if (!hasPermission(role, "notifications.manage") && !hasPermission(role, "notifications.send"))
    redirect("/forbidden");

  let campaigns: Awaited<ReturnType<typeof listCampaignsDb>> = [];
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  try {
    campaigns = await listCampaignsDb();
    templates = await listTemplates();
  } catch {
    // DB not available
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Кампании уведомлений v2</h1>
        <p className="text-sm text-zinc-600">
          Рассылки по сегментам с dry-run, лимитами и журналом доставок
        </p>
      </div>
      <CampaignsV2Client initialCampaigns={campaigns} templates={templates} />
    </div>
  );
}
