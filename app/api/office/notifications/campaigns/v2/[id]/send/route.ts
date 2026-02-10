export const runtime = "nodejs";

import { ok, badRequest, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { hasPermission } from "@/lib/permissions";
import { logAdminAction } from "@/lib/audit";
import {
  getCampaign,
  updateCampaignStatus,
  createDelivery,
} from "@/lib/notifications/campaigns.pg";
import { getTemplate } from "@/lib/notifications/templates.pg";
import { buildDebtorsSegment } from "@/lib/notifications/segment";
import { renderTemplate, maskContact } from "@/lib/notifications/templateEngine";
import { getProvider } from "@/lib/notifications/provider";
import type { TemplateChannel } from "@/lib/notifications/templateEngine";

const MAX_RECIPIENTS = 500;
const BATCH_SIZE = 30;
const BATCH_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";
  if (!session) return unauthorized(request);
  if (!isStaffOrAdmin(role)) return forbidden(request);
  if (!hasPermission(role, "notifications.send") && !hasPermission(role, "notifications.manage"))
    return forbidden(request);

  try {
    const campaign = await getCampaign(id);
    if (!campaign) return badRequest(request, "Кампания не найдена");
    if (campaign.status !== "draft" && campaign.status !== "dry_run") {
      return badRequest(request, `Кампания в статусе ${campaign.status}, отправка невозможна`);
    }

    const template = campaign.templateId ? await getTemplate(campaign.templateId) : null;
    if (!template) return badRequest(request, "Шаблон кампании не найден");

    const recipients = buildDebtorsSegment(campaign.segment);
    if (recipients.length > MAX_RECIPIENTS) {
      return badRequest(request, `Слишком много получателей: ${recipients.length} (макс. ${MAX_RECIPIENTS})`);
    }

    await updateCampaignStatus(id, "sending");
    const provider = getProvider();
    const channel = campaign.channel as TemplateChannel;

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const contact = r.contact || "";
      const contactMasked = contact ? maskContact(contact) : "нет контакта";

      if (!contact) {
        await createDelivery({
          campaignId: id,
          userId: r.userId,
          personId: r.personId,
          plotId: r.plotId,
          channel: campaign.channel,
          recipientMasked: contactMasked,
          status: "skipped",
          error: "no_contact",
          providerMessageId: null,
          sentAt: null,
        });
        continue;
      }

      let rendered: { subject?: string; body: string };
      try {
        rendered = renderTemplate(
          { subject: template.subject, body: template.body },
          {
            fullName: r.fullName,
            plotNumber: r.plotLabel,
            debtAmount: r.debtAmount,
            period: campaign.segment.period ?? new Date().toISOString().slice(0, 7),
            payLink: process.env.NEXT_PUBLIC_PAY_LINK ?? "https://snt.example.com/pay",
          },
          channel,
          { softMode: true },
        );
      } catch {
        await createDelivery({
          campaignId: id,
          userId: r.userId,
          personId: r.personId,
          plotId: r.plotId,
          channel: campaign.channel,
          recipientMasked: contactMasked,
          status: "failed",
          error: "render_error",
          providerMessageId: null,
          sentAt: null,
        });
        failed++;
        continue;
      }

      try {
        const result = await provider.send({
          to: contact,
          channel: campaign.channel,
          subject: rendered.subject,
          body: rendered.body,
        });

        if (result.success) {
          sent++;
          await createDelivery({
            campaignId: id,
            userId: r.userId,
            personId: r.personId,
            plotId: r.plotId,
            channel: campaign.channel,
            recipientMasked: contactMasked,
            status: "sent",
            error: null,
            providerMessageId: result.messageId ?? null,
            sentAt: new Date().toISOString(),
          });
        } else {
          failed++;
          await createDelivery({
            campaignId: id,
            userId: r.userId,
            personId: r.personId,
            plotId: r.plotId,
            channel: campaign.channel,
            recipientMasked: contactMasked,
            status: "failed",
            error: result.error ?? "send_failed",
            providerMessageId: null,
            sentAt: null,
          });
        }
      } catch (err) {
        failed++;
        await createDelivery({
          campaignId: id,
          userId: r.userId,
          personId: r.personId,
          plotId: r.plotId,
          channel: campaign.channel,
          recipientMasked: contactMasked,
          status: "failed",
          error: err instanceof Error ? err.message : "unknown_error",
          providerMessageId: null,
          sentAt: null,
        });
      }

      // Rate limit: pause every BATCH_SIZE sends
      if ((i + 1) % BATCH_SIZE === 0 && i < recipients.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const finalStatus = failed > 0 && sent === 0 ? "failed" : "done";
    const stats = { targeted: recipients.length, sent, failed };
    await updateCampaignStatus(id, finalStatus, stats);

    await logAdminAction({
      action: "campaign.send",
      entity: "notification_campaign",
      entityId: id,
      route: `/api/office/notifications/campaigns/v2/${id}/send`,
      success: true,
      meta: { ...stats, provider: provider.name },
      headers: request.headers,
    });

    return ok(request, { campaign: await getCampaign(id), stats });
  } catch (error) {
    await updateCampaignStatus(id, "failed").catch(() => {});
    return serverError(request, "Ошибка отправки кампании", error);
  }
}
