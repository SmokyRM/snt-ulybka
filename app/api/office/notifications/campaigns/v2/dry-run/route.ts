export const runtime = "nodejs";

import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { getTemplate } from "@/lib/notifications/templates.pg";
import { buildDebtorsSegment } from "@/lib/notifications/segment";
import { renderTemplate } from "@/lib/notifications/templateEngine";
import type { CampaignSegment } from "@/lib/notifications/campaigns.pg";

const MAX_SAMPLE = 10;

export async function POST(request: Request) {
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";
  if (!session) return unauthorized(request);
  if (!isStaffOrAdmin(role)) return forbidden(request);
  if (!hasPermission(role, "notifications.generate_campaign") && !hasPermission(role, "notifications.manage"))
    return forbidden(request);

  try {
    const body = await request.json().catch(() => ({}));
    const templateId = typeof body.templateId === "string" ? body.templateId : null;
    const channel = typeof body.channel === "string" ? body.channel : "telegram";
    const segment: CampaignSegment = typeof body.segment === "object" && body.segment ? body.segment : {};

    if (!templateId) return badRequest(request, "templateId обязателен");

    const template = await getTemplate(templateId);
    if (!template) return badRequest(request, "Шаблон не найден");

    const recipients = buildDebtorsSegment(segment);
    const problems: string[] = [];
    const sample = recipients.slice(0, MAX_SAMPLE).map((r) => {
      if (!r.contact) {
        problems.push(`${r.fullName} (${r.plotLabel}): нет контакта`);
      }
      try {
        const rendered = renderTemplate(
          { subject: template.subject, body: template.body },
          {
            fullName: r.fullName,
            plotNumber: r.plotLabel,
            debtAmount: r.debtAmount,
            period: segment.period ?? new Date().toISOString().slice(0, 7),
            payLink: process.env.NEXT_PUBLIC_PAY_LINK ?? "https://snt.example.com/pay",
          },
          channel as "telegram" | "email" | "sms" | "print",
          { softMode: true },
        );
        return {
          fullName: r.fullName,
          plotLabel: r.plotLabel,
          contactMasked: r.contactMasked,
          debtAmount: r.debtAmount,
          preview: rendered.body.slice(0, 300),
        };
      } catch {
        return {
          fullName: r.fullName,
          plotLabel: r.plotLabel,
          contactMasked: r.contactMasked,
          debtAmount: r.debtAmount,
          preview: "(ошибка рендеринга)",
        };
      }
    });

    const noContact = recipients.filter((r) => !r.contact).length;
    if (noContact > 0) {
      problems.push(`Всего без контакта: ${noContact}`);
    }

    return ok(request, {
      count: recipients.length,
      noContact,
      sample,
      problems,
    });
  } catch (error) {
    return serverError(request, "Ошибка dry-run", error);
  }
}
