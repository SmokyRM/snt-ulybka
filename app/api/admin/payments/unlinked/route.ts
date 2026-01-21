import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listPayments, findPlotById } from "@/lib/mockDb";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);

  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const offset = Number(url.searchParams.get("offset") || "0");

    // Get payments without targetFundId
    const allPayments = listPayments({ includeVoided: false })
      .filter((p) => !p.targetFundId)
      .map((p) => {
        const plot = findPlotById(p.plotId);
        return {
          ...p,
          plotStreet: plot?.street,
          plotNumber: plot?.plotNumber,
          ownerFullName: plot?.ownerFullName,
        };
      })
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

    const paginated = allPayments.slice(offset, offset + limit);

    return ok(request, {
      items: paginated,
      total: allPayments.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error listing unlinked payments:", error);
    return serverError(request, "Ошибка получения списка платежей", error);
  }
}
