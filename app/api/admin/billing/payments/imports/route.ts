import { NextResponse } from "next/server";
import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listPaymentImports, listUsers } from "@/lib/mockDb";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";

/** Список импортов платежей. Admin + office. */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorized(request);
    if (!hasFinanceAccess(user) && !isOfficeRole(user.role) && !isAdminRole(user.role)) {
      return forbidden(request);
    }

    const imports = listPaymentImports();
    const users = listUsers(1000);

    const enriched = imports.map((imp) => {
      const createdBy = imp.createdByUserId ? users.find((u) => u.id === imp.createdByUserId) : null;
      const appliedBy = imp.appliedByUserId ? users.find((u) => u.id === imp.appliedByUserId) : null;
      return {
        ...imp,
        createdByName: createdBy?.email ?? createdBy?.fullName ?? "—",
        appliedByName: appliedBy?.email ?? appliedBy?.fullName ?? null,
      };
    });

    return ok(request, { imports: enriched });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
