import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { listNotificationSendLogs } from "@/lib/billing";
import { ok, unauthorized, serverError } from "@/lib/api/respond";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const url = new URL(request.url);
    const plotId = url.searchParams.get("plotId");
    const templateId = url.searchParams.get("templateId");
    const channel = url.searchParams.get("channel") as "sms" | "telegram" | "email" | "site" | null;
    const status = url.searchParams.get("status") as "sent" | "failed" | "simulated" | null;

    const logs = listNotificationSendLogs({
      plotId: plotId || null,
      templateId: templateId || null,
      channel: channel || null,
      status: status || null,
    });

    return ok(request, { logs });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}