import { ok, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { buildResidentBillingSummary } from "@/lib/cabinet/billing.server";
import { isResidentRole } from "@/lib/rbac";
import { getEffectiveSessionUser } from "@/lib/session.server";

export async function GET(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  if (!session) {
    return unauthorized(request);
  }
  if (!isResidentRole(session.role)) {
    return forbidden(request);
  }

  try {
    const summary = buildResidentBillingSummary(session.id);
    return ok(request, summary);
  } catch (error) {
    return serverError(request, "Не удалось загрузить баланс", error);
  }
}
