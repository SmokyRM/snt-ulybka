import { getSessionUser, hasFinanceAccess } from "@/lib/session.server";
import { ok, unauthorized, badRequest, fail, serverError } from "@/lib/api/respond";
import {
  getMessageTemplate,
  createNotificationSendLog,
  listNotificationSendLogs,
} from "@/lib/billing";
import { listPlots } from "@/lib/mockDb";
import { getPlotBalance } from "@/lib/billing/services";
import { logActivity } from "@/lib/activityLog.store";
import { logAdminAction } from "@/lib/audit";

// Extract variables from message template
function extractVariables(message: string): string[] {
  const matches = message.match(/\{([^}]+)\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(1, -1)); // Remove { and }
}

// Replace variables in message
function replaceVariables(message: string, variables: Record<string, string | number>): string {
  let result = message;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  });
  return result;
}

// Build variables from plot data
function buildVariables(plotId: string, plot: { street: string; plotNumber: string; ownerFullName?: string | null }, balance: ReturnType<typeof getPlotBalance>): Record<string, string | number> {
  const periods = balance.breakdown
    .map((b) => {
      const period = balance.periodId ? `${balance.periodId}` : "unknown";
      return `${period}: ${b.amount.toFixed(2)} ₽`;
    })
    .join(", ");

  return {
    plotNumber: plot.plotNumber || "",
    ownerName: plot.ownerFullName || "Не указано",
    debtAmount: balance.totalDebt.toFixed(2),
    periods: periods || "Нет периодов",
    street: plot.street || "",
  };
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!hasFinanceAccess(user)) {
      return unauthorized(request);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return badRequest(request, "Bad request");
    }

    const templateId = typeof body.templateId === "string" ? body.templateId.trim() : "";
    const plotIds = Array.isArray(body.plotIds) ? body.plotIds.filter((id: unknown) => typeof id === "string") : [];
    const channel = body.channel === "sms" || body.channel === "telegram" || body.channel === "email" || body.channel === "site" ? body.channel : "site";
    const simulate = Boolean(body.simulate);

    if (!templateId || plotIds.length === 0) {
      return badRequest(request, "Template ID and plot IDs are required");
    }

    const template = getMessageTemplate(templateId);
    if (!template) {
      return fail(request, "not_found", "Template not found", 404);
    }

  const plots = listPlots();
  const logs: Array<{ plotId: string; status: "sent" | "failed" | "simulated"; error?: string }> = [];

  for (const plotId of plotIds) {
    const plot = plots.find((p) => p.id === plotId);
    if (!plot) {
      logs.push({ plotId, status: "failed", error: "Plot not found" });
      continue;
    }

    try {
      // Get plot balance for variables
      const balance = getPlotBalance(plotId);
      const variables = buildVariables(plotId, plot, balance);

      // Replace variables in message
      const message = replaceVariables(template.message, variables);

      // Simulate or send (stubbed for now)
      if (simulate) {
        // Log to ActivityLog and store
        logActivity({
          actorUserId: user?.id ?? null,
          actorRole: user?.role ?? null,
          entityType: "notification",
          entityId: plotId,
          action: "notification.simulated",
          meta: {
            templateId,
            channel,
            message,
            variables,
          },
        });

        createNotificationSendLog({
          plotId,
          templateId,
          channel,
          status: "simulated",
          message,
          variables,
          createdByUserId: user?.id ?? null,
        });

        logs.push({ plotId, status: "simulated" });
      } else {
        // TODO: Real sending (SMS/Telegram) would go here
        // For now, stub it and log
        logActivity({
          actorUserId: user?.id ?? null,
          actorRole: user?.role ?? null,
          entityType: "notification",
          entityId: plotId,
          action: "notification.sent",
          meta: {
            templateId,
            channel,
            message,
            variables,
            stubbed: true,
          },
        });

        createNotificationSendLog({
          plotId,
          templateId,
          channel,
          status: "sent",
          message,
          variables,
          createdByUserId: user?.id ?? null,
        });

        logs.push({ plotId, status: "sent" });
      }
    } catch (error) {
      logs.push({
        plotId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      createNotificationSendLog({
        plotId,
        templateId,
        channel,
        status: "failed",
        message: template.message,
        variables: {},
        createdByUserId: user?.id ?? null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const sentCount = logs.filter((l) => l.status === "sent").length;
  const simulatedCount = logs.filter((l) => l.status === "simulated").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;

    await logAdminAction({
      action: simulate ? "notifications_simulated" : "notifications_sent",
      entity: "notification_batch",
      entityId: null,
      after: {
        templateId,
        channel,
        total: plotIds.length,
        sent: sentCount,
        simulated: simulatedCount,
        failed: failedCount,
      },
      meta: { actorUserId: user?.id ?? null, actorRole: user?.role ?? null },
    });

    return ok(request, {
      logs,
      summary: {
        total: plotIds.length,
        sent: sentCount,
        simulated: simulatedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}