import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { listDebts } from "@/lib/billing.store";
import { bulkCreateNotificationDrafts, type NotificationDraftInput, type NotificationChannel } from "@/lib/notificationDrafts.store";

const DEFAULT_SUBJECT = "Уведомление о задолженности";
const DEFAULT_TEMPLATE = `Уважаемый(ая) {{residentName}},

Сообщаем Вам о наличии задолженности по взносам в СНТ.

Участок: {{plotLabel}}
Сумма задолженности: {{debtAmount}} руб.

Просим Вас погасить задолженность в ближайшее время.

С уважением,
Правление СНТ`;

function renderTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  });
  return result;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/drafts/generate",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role)) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/notifications/drafts/generate",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const channel = typeof body.channel === "string" ? body.channel : "telegram";
    const minDebt = typeof body.minDebt === "number" ? body.minDebt : 0;
    const subject = typeof body.subject === "string" ? body.subject : DEFAULT_SUBJECT;
    const template = typeof body.template === "string" ? body.template : DEFAULT_TEMPLATE;
    const templateId = typeof body.templateId === "string" ? body.templateId : null;

    if (channel !== "telegram" && channel !== "email" && channel !== "sms" && channel !== "print") {
      return fail(request, "validation_error", "Неверный канал уведомления", 400);
    }

    // Get debtors
    const debts = listDebts().filter((d) => d.debt >= minDebt);

    if (debts.length === 0) {
      return ok(request, { created: 0, drafts: [] });
    }

    const inputs: NotificationDraftInput[] = debts.map((debt) => {
      const vars = {
        residentName: debt.residentName,
        plotLabel: debt.plotId,
        debtAmount: debt.debt,
      };
      return {
        plotId: debt.key,
        plotLabel: debt.plotId,
        residentName: debt.residentName,
        debtAmount: debt.debt,
        channel: channel as NotificationChannel,
        subject,
        body: renderTemplate(template, vars),
        templateId,
        createdBy: session.id ?? null,
      };
    });

    const drafts = bulkCreateNotificationDrafts(inputs);

    return ok(request, { created: drafts.length, drafts });
  } catch (error) {
    return serverError(request, "Ошибка генерации уведомлений", error);
  }
}
