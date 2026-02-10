export const runtime = "nodejs";

import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { getCampaign, listDeliveries, countDeliveriesByCampaign } from "@/lib/notifications/campaigns.pg";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";
  if (!session) return unauthorized(request);
  if (!isStaffOrAdmin(role)) return forbidden(request);

  try {
    const campaign = await getCampaign(id);
    if (!campaign) return badRequest(request, "Кампания не найдена");

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") ?? undefined;
    const deliveries = await listDeliveries(id, { status: statusFilter });
    const counts = await countDeliveriesByCampaign(id);

    return ok(request, { campaign, deliveries, counts });
  } catch (error) {
    return serverError(request, "Ошибка загрузки доставок", error);
  }
}
