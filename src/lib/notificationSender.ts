/**
 * Notification Sender Service
 * Sprint 19: Orchestrates sending notifications with rate limiting
 */

import { sendTelegramMessage } from "@/lib/notifications/telegram";
import {
  type NotificationDraft,
  getNotificationDraft,
  markNotificationDraftSending,
  markNotificationDraftSentWithId,
  markNotificationDraftFailed,
  markNotificationDraftSkipped,
  listDraftsReadyToSend,
} from "@/lib/notificationDrafts.store";
import { canSendNotification, recordNotificationSent, getRateLimitInfo } from "@/lib/notificationRateLimiter";
import { logStructured } from "@/lib/structuredLogger/node";

export type SendPreviewResult = {
  willSend: number;
  skipped: number;
  alreadySent: number;
  invalidRecipient: number;
  rateLimitRemaining: number;
  rateLimitResetInMs: number;
  sample: Array<{
    id: string;
    plotLabel: string;
    residentName: string;
    body: string;
    skipReason: string | null;
  }>;
  skipReasons: Record<string, number>;
};

export type SendConfirmResult = {
  sent: number;
  failed: number;
  skipped: number;
  rateLimited: number;
  results: Array<{
    id: string;
    status: "sent" | "failed" | "skipped" | "rate_limited";
    error?: string;
    externalId?: string;
  }>;
};

/**
 * Analyze drafts and return preview of what would be sent
 */
export function previewSend(options: {
  channel?: "telegram";
  limit?: number;
}): SendPreviewResult {
  const drafts = listDraftsReadyToSend({ channel: options.channel, limit: options.limit });
  const rateLimitInfo = getRateLimitInfo();

  const result: SendPreviewResult = {
    willSend: 0,
    skipped: 0,
    alreadySent: 0,
    invalidRecipient: 0,
    rateLimitRemaining: rateLimitInfo.remaining,
    rateLimitResetInMs: rateLimitInfo.resetInMs,
    sample: [],
    skipReasons: {},
  };

  const sampleLimit = 5;

  for (const draft of drafts) {
    const analysis = analyzeDraft(draft);

    if (analysis.canSend) {
      result.willSend += 1;
      if (result.sample.length < sampleLimit) {
        result.sample.push({
          id: draft.id,
          plotLabel: draft.plotLabel,
          residentName: draft.residentName,
          body: draft.body.slice(0, 200) + (draft.body.length > 200 ? "..." : ""),
          skipReason: null,
        });
      }
    } else {
      result.skipped += 1;
      const reason = analysis.skipReason || "unknown";
      result.skipReasons[reason] = (result.skipReasons[reason] || 0) + 1;

      if (reason === "invalidRecipient") {
        result.invalidRecipient += 1;
      }

      if (result.sample.length < sampleLimit) {
        result.sample.push({
          id: draft.id,
          plotLabel: draft.plotLabel,
          residentName: draft.residentName,
          body: draft.body.slice(0, 200) + (draft.body.length > 200 ? "..." : ""),
          skipReason: reason,
        });
      }
    }
  }

  // Adjust willSend based on rate limit
  if (result.willSend > rateLimitInfo.remaining) {
    result.willSend = rateLimitInfo.remaining;
  }

  return result;
}

/**
 * Analyze a draft to determine if it can be sent
 */
function analyzeDraft(draft: NotificationDraft): { canSend: boolean; skipReason: string | null } {
  // Check if already sent
  if (draft.status === "sent") {
    return { canSend: false, skipReason: "alreadySent" };
  }

  // Check if not approved
  if (draft.status !== "approved") {
    return { canSend: false, skipReason: "notApproved" };
  }

  // Check channel-specific requirements
  if (draft.channel === "telegram") {
    if (!draft.recipientTgChatId || !draft.recipientTgChatId.trim()) {
      return { canSend: false, skipReason: "invalidRecipient" };
    }
  }

  // Check if body is empty
  if (!draft.body || !draft.body.trim()) {
    return { canSend: false, skipReason: "emptyBody" };
  }

  return { canSend: true, skipReason: null };
}

/**
 * Actually send notifications
 */
export async function confirmSend(options: {
  channel?: "telegram";
  limit?: number;
}): Promise<SendConfirmResult> {
  const drafts = listDraftsReadyToSend({ channel: options.channel, limit: options.limit });

  const result: SendConfirmResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    rateLimited: 0,
    results: [],
  };

  for (const draft of drafts) {
    const analysis = analyzeDraft(draft);

    if (!analysis.canSend) {
      // Skip and record reason
      markNotificationDraftSkipped(draft.id, analysis.skipReason || "unknown");
      result.skipped += 1;
      result.results.push({
        id: draft.id,
        status: "skipped",
        error: analysis.skipReason || "unknown",
      });
      continue;
    }

    // Check rate limit
    const rateLimitCheck = canSendNotification();
    if (!rateLimitCheck.allowed) {
      result.rateLimited += 1;
      result.results.push({
        id: draft.id,
        status: "rate_limited",
        error: `Rate limit exceeded. Reset in ${Math.ceil(rateLimitCheck.resetInMs / 1000)}s`,
      });
      continue;
    }

    // Mark as sending
    markNotificationDraftSending(draft.id);

    try {
      // Send based on channel
      if (draft.channel === "telegram") {
        const sendResult = await sendTelegramMessage(draft.recipientTgChatId!, draft.body);

        if (sendResult && sendResult.success) {
          recordNotificationSent();
          markNotificationDraftSentWithId(draft.id, sendResult.providerMessageId || null);
          result.sent += 1;
          result.results.push({
            id: draft.id,
            status: "sent",
            externalId: sendResult.providerMessageId,
          });

          logStructured("info", {
            action: "notification_sent",
            draftId: draft.id,
            channel: draft.channel,
            externalId: sendResult.providerMessageId,
          });
        } else {
          // Token not configured - mark as skipped
          markNotificationDraftSkipped(draft.id, "providerNotConfigured");
          result.skipped += 1;
          result.results.push({
            id: draft.id,
            status: "skipped",
            error: "providerNotConfigured",
          });
        }
      } else {
        // Unsupported channel
        markNotificationDraftSkipped(draft.id, "unsupportedChannel");
        result.skipped += 1;
        result.results.push({
          id: draft.id,
          status: "skipped",
          error: "unsupportedChannel",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      markNotificationDraftFailed(draft.id, errorMessage);
      result.failed += 1;
      result.results.push({
        id: draft.id,
        status: "failed",
        error: errorMessage,
      });

      logStructured("error", {
        action: "notification_send_failed",
        draftId: draft.id,
        channel: draft.channel,
        error: errorMessage,
      });
    }
  }

  return result;
}

/**
 * Check if Telegram is configured
 */
export function isTelegramConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return !!(token && token.trim());
}

/**
 * Get default test chat ID
 */
export function getDefaultTelegramChatId(): string | null {
  return process.env.TELEGRAM_DEFAULT_CHAT_ID || null;
}
