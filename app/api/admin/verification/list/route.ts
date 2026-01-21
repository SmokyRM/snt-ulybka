import { ok, forbidden, serverError } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { getUsersByStatus } from "@/lib/mockDb";
import { getPerson } from "@/lib/registry/core/persons.store";
import { listPlots } from "@/lib/registry/core/plots.store";

export async function GET(request: Request) {
  const user = await getSessionUser();
  const role = user?.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request, "Недостаточно прав");
  }

  try {
    const pendingUsers = getUsersByStatus("pending_verification");

    // Enrich users with person data
    const enriched = pendingUsers.map((u) => {
      let personData = null;
      let plotsData: Array<{ plotNumber: string; sntStreetNumber: string }> = [];

      if (u.pendingPersonId) {
        const person = getPerson(u.pendingPersonId);
        if (person) {
          personData = {
            fullName: person.fullName,
            phone: person.phone,
            email: person.email,
          };
          const plots = listPlots({ personId: u.pendingPersonId });
          plotsData = plots.map((p) => ({
            plotNumber: p.plotNumber,
            sntStreetNumber: p.sntStreetNumber,
          }));
        }
      }

      return {
        ...u,
        personData,
        plotsData,
      };
    });

    return ok(request, { users: enriched });
  } catch (error) {
    console.error("Error listing pending verifications:", error);
    return serverError(request, "Ошибка получения списка", error);
  }
}
