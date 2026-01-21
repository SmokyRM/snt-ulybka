import { fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { getTargetFundTimeline, getTargetFundWithStats } from "@/lib/targets";
import { listPayments, findPlotById } from "@/lib/mockDb";

type ParamsPromise<T> = { params: Promise<T> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, { params }: ParamsPromise<{ id: string }>) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);

  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const { id } = await params;
    const fund = getTargetFundWithStats(id);
    if (!fund) return fail(request, "not_found", "not_found", 404);
    const timeline = getTargetFundTimeline(id);

    // Get payments linked to this target fund
    const payments = listPayments({ includeVoided: false })
      .filter((p) => p.targetFundId === id)
      .map((p) => {
        const plot = findPlotById(p.plotId);
        return {
          ...p,
          plotStreet: plot?.street,
          plotNumber: plot?.plotNumber,
        };
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    return ok(request, { fund, timeline, collectedByMonth: timeline.collected, payments });
  } catch (error) {
    console.error("Error fetching target fund:", error);
    return serverError(request, "Ошибка получения целевого фонда", error);
  }
}
