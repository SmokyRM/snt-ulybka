import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { listPaymentImportJobs } from "@/lib/billing";
import { ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const jobs = listPaymentImportJobs();
    return ok(request, { jobs });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}