import "server-only";

import { listDebtorSegments } from "@/lib/office/debtors";
import { findUserById } from "@/lib/mockDb";
import { renderTemplate, getDefaultPlaceholderValues } from "@/lib/notificationTemplates";
import { canSendNotification, recordNotificationSent } from "@/lib/notificationRateLimiter";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import {
  type Campaign,
  type CommunicationStatus,
  type CommunicationLog,
  updateCampaign,
  updateCampaignStats,
  addCommunicationLog,
} from "./communications.store";

type Recipient = {
  plotId: string;
  residentId: string;
  residentName: string;
  plotLabel: string;
  debtAmount: number;
  telegramChatId: string | null;
};

const buildRecipients = (campaign: Campaign): Recipient[] => {
  const filters = campaign.filters ?? {};
  const minDebt = typeof filters.minDebt === "number" ? filters.minDebt : 0;
  const minDaysOverdue = typeof filters.daysOverdue === "number" ? filters.daysOverdue : null;
  const segment = typeof filters.segment === "string" ? filters.segment : null;
  const debts = listDebtorSegments();
  let rows = debts;

  if (campaign.audience === "debtors") {
    rows = rows.filter((d) => d.totalDebt > 0);
  }
  if (campaign.audience === "filtered") {
    rows = rows.filter((d) => d.totalDebt >= minDebt);
    if (minDaysOverdue !== null) {
      rows = rows.filter((d) => d.overdueDays >= minDaysOverdue);
    }
    if (segment) {
      rows = rows.filter((d) => d.segment === segment);
    }
  }

  return rows.map((row) => {
    const user = findUserById(row.residentId);
    return {
      plotId: row.plotId,
      residentId: row.residentId,
      residentName: row.residentName,
      plotLabel: row.plotLabel,
      debtAmount: row.totalDebt,
      telegramChatId: user?.telegramChatId ?? null,
    };
  });
};

export const previewCampaign = (campaign: Campaign) => {
  const recipients = buildRecipients(campaign);
  const sample = recipients.slice(0, 3).map((recipient) => {
    const values = getDefaultPlaceholderValues({
      residentName: recipient.residentName,
      plotLabel: recipient.plotLabel,
      debtAmount: recipient.debtAmount,
      period: campaign.filters?.period ?? undefined,
    });
    const rendered = renderTemplate(campaign.templateKey as never, values);
    return {
      plotId: recipient.plotId,
      residentName: recipient.residentName,
      text: rendered?.body ?? "",
    };
  });
  return { targetedCount: recipients.length, sample };
};

export async function sendCampaign(campaign: Campaign, requestId: string | null) {
  const recipients = buildRecipients(campaign);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  updateCampaignStats(campaign.id, { targetedCount: recipients.length, sentCount: 0, failedCount: 0, skippedCount: 0 });

  for (const recipient of recipients) {
    const rate = canSendNotification();
    if (!rate.allowed) {
      skipped += 1;
      addCommunicationLog({
        userId: recipient.residentId,
        plotId: recipient.plotId,
        campaignId: campaign.id,
        channel: campaign.channel,
        templateKey: campaign.templateKey,
        renderedText: "Rate limited",
        status: "skipped",
        sentAt: new Date().toISOString(),
        providerMessageId: null,
        error: "rate_limited",
        requestId,
      });
      continue;
    }

    const values = getDefaultPlaceholderValues({
      residentName: recipient.residentName,
      plotLabel: recipient.plotLabel,
      debtAmount: recipient.debtAmount,
      period: campaign.filters?.period ?? undefined,
    });
    const rendered = renderTemplate(campaign.templateKey as never, values);
    const text = rendered?.body ?? "";

    if (campaign.channel === "telegram") {
      if (!recipient.telegramChatId) {
        skipped += 1;
        addCommunicationLog({
          userId: recipient.residentId,
          plotId: recipient.plotId,
          campaignId: campaign.id,
          channel: campaign.channel,
          templateKey: campaign.templateKey,
          renderedText: text,
          status: "skipped",
          sentAt: new Date().toISOString(),
          providerMessageId: null,
          error: "missing_chat_id",
          requestId,
        });
        continue;
      }

      try {
        const result = await sendTelegramMessage(recipient.telegramChatId, text);
        if (!result) {
          skipped += 1;
          addCommunicationLog({
            userId: recipient.residentId,
            plotId: recipient.plotId,
            campaignId: campaign.id,
            channel: campaign.channel,
            templateKey: campaign.templateKey,
            renderedText: text,
            status: "skipped",
            sentAt: new Date().toISOString(),
            providerMessageId: null,
            error: "token_missing",
            requestId,
          });
        } else {
          sent += 1;
          recordNotificationSent();
          addCommunicationLog({
            userId: recipient.residentId,
            plotId: recipient.plotId,
            campaignId: campaign.id,
            channel: campaign.channel,
            templateKey: campaign.templateKey,
            renderedText: text,
            status: "sent",
            sentAt: new Date().toISOString(),
            providerMessageId: result.providerMessageId ?? null,
            error: null,
            requestId,
          });
        }
      } catch (error) {
        failed += 1;
        addCommunicationLog({
          userId: recipient.residentId,
          plotId: recipient.plotId,
          campaignId: campaign.id,
          channel: campaign.channel,
          templateKey: campaign.templateKey,
          renderedText: text,
          status: "failed",
          sentAt: new Date().toISOString(),
          providerMessageId: null,
          error: error instanceof Error ? error.message : "send_failed",
          requestId,
        });
      }
    } else {
      skipped += 1;
      addCommunicationLog({
        userId: recipient.residentId,
        plotId: recipient.plotId,
        campaignId: campaign.id,
        channel: campaign.channel,
        templateKey: campaign.templateKey,
        renderedText: text,
        status: "skipped",
        sentAt: new Date().toISOString(),
        providerMessageId: null,
        error: "email_not_configured",
        requestId,
      });
    }

    updateCampaignStats(campaign.id, { sentCount: sent, failedCount: failed, skippedCount: skipped });
  }

  const status: CommunicationStatus = failed > 0 ? "failed" : "sent";
  updateCampaign(campaign.id, { status: failed > 0 ? "failed" : "done", lastError: failed > 0 ? "partial_failures" : null });
  return { status, sent, failed, skipped };
}
