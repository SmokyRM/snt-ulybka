import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getPaymentDetailsSettingServer, updatePaymentDetailsSetting } from "@/lib/settings.server";
import type { PaymentDetails } from "@/config/paymentDetails";
import { logAdminAction } from "@/lib/audit";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const setting = getPaymentDetailsSettingServer();
    return ok(request, setting);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  if (!hasAdminAccess(user)) return forbidden(request);

  try {
    const body = await request.json().catch(() => ({}));
    const before = getPaymentDetailsSettingServer();

    const value: PaymentDetails = {
      receiver: (body.receiver as string) || before.value.receiver,
      inn: (body.inn as string) || before.value.inn,
      kpp: (body.kpp as string) || before.value.kpp,
      account: (body.account as string) || before.value.account,
      bank: (body.bank as string) || before.value.bank,
      bankInn: (body.bankInn as string) || before.value.bankInn,
      bic: (body.bic as string) || before.value.bic,
      corr: (body.corr as string) || before.value.corr,
      address: (body.address as string) || "",
      chairman: (body.chairman as string) || "",
      chairmanPhone: (body.chairmanPhone as string) || "",
      chairmanEmail: (body.chairmanEmail as string) || "",
    };

    const updated = updatePaymentDetailsSetting(value, {
      actorUserId: user.id ?? null,
      actorRole: user.role ?? null,
    });

    await logAdminAction({
      action: "update_requisites",
      entity: "requisites",
      entityId: "payment_details",
      before: before.value,
      after: updated.value,
      headers: request.headers,
    });

    return ok(request, updated);
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
