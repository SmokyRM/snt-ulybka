import { getSessionUser } from "@/lib/session.server";
import { isAdminRole, isOfficeRole } from "@/lib/rbac";
import { listPersons, listPlots, getInviteCodeByPersonId, listInviteCodes, getInviteCodeStatus } from "@/lib/registry/core";
import type { RegistryPerson } from "@/types/snt";
import { forbidden, ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return unauthorized(request, "Unauthorized");
    }

    const role = user.role;
    if (!isAdminRole(role) && !isOfficeRole(role)) {
      return forbidden(request, "Forbidden");
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const verificationStatusParam = searchParams.get("verificationStatus");
    const verificationStatus = verificationStatusParam
      ? (verificationStatusParam as "not_verified" | "pending" | "verified" | "rejected")
      : undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? "10") || 10));

    const persons = listPersons({ q, verificationStatus: verificationStatus || undefined });
    const total = persons.length;
    const start = (page - 1) * limit;
    const pageItems = persons.slice(start, start + limit);
    const plots = listPlots();

    // Enrich persons with plot details and invite codes
    const enriched: Array<
      RegistryPerson & {
        plotsData: Array<{ id: string; plotNumber: string; sntStreetNumber: string; cityAddress?: string | null }>;
        inviteCode?: {
          id: string;
          status: "active" | "used" | "revoked" | "expired";
          createdAt: string;
          usedAt?: string | null;
        } | null;
      }
    > = pageItems.map((person) => {
      const inviteCode = getInviteCodeByPersonId(person.id);
      const allCodes = listInviteCodes({ personId: person.id });
      const latestCode = allCodes.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];

      return {
        ...person,
        plotsData: person.plots
          .map((plotId) => plots.find((p) => p.id === plotId))
          .filter((p): p is NonNullable<typeof p> => p !== undefined)
          .map((p) => ({
            id: p.id,
            plotNumber: p.plotNumber,
            sntStreetNumber: p.sntStreetNumber,
            cityAddress: p.cityAddress,
          })),
        inviteCode: latestCode
          ? {
              id: latestCode.id,
              status: getInviteCodeStatus(latestCode),
              createdAt: latestCode.createdAt,
              usedAt: latestCode.usedAt,
            }
          : null,
      };
    });

    return ok(request, { persons: enriched, total, page, limit });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
