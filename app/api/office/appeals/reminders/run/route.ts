/**
 * Sprint 34: Appeals Overdue Reminders Job
 * POST /api/office/appeals/reminders/run
 * Finds overdue appeals and creates notification drafts
 */
import { ok, fail, unauthorized, forbidden, serverError } from "@/lib/api/respond";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isStaffOrAdmin } from "@/lib/rbac";
import { logAuthEvent, logStructured } from "@/lib/structuredLogger/node";
import { listAppeals } from "@/server/services/appeals";
import { createNotification } from "@/server/notifications/internal.store";
import { logAuditEvent, generateRequestId } from "@/lib/auditLog.store";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getEffectiveSessionUser().catch(() => null);
  const role = (session?.role as Role | undefined) ?? "resident";

  if (!session) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/appeals/reminders/run",
      role: null,
      userId: null,
      status: 401,
      latencyMs: Date.now() - startedAt,
      error: "UNAUTHORIZED",
    });
    return unauthorized(request);
  }

  if (!isStaffOrAdmin(role) || !hasPermission(role, "appeals.run_reminders")) {
    logAuthEvent({
      action: "rbac_deny",
      path: "/api/office/appeals/reminders/run",
      role,
      userId: session.id ?? null,
      status: 403,
      latencyMs: Date.now() - startedAt,
      error: "FORBIDDEN",
    });
    return forbidden(request);
  }

  try {
    const requestId = generateRequestId();
    const now = new Date();

    // Get all appeals
    const allAppeals = await listAppeals({});

    // Filter overdue: status != closed && dueAt < now
    const overdueAppeals = allAppeals.filter((appeal) => {
      if (appeal.status === "closed") return false;
      if (!appeal.dueAt) return false;
      return new Date(appeal.dueAt) < now;
    });

    logStructured("info", {
      action: "appeals_reminders_run_start",
      userId: session.id,
      totalAppeals: allAppeals.length,
      overdueCount: overdueAppeals.length,
      requestId,
    });

    // Create notifications for overdue appeals
    const created: string[] = [];
    const skipped: string[] = [];

    for (const appeal of overdueAppeals) {
      // Calculate overdue duration
      const overdueDays = Math.ceil(
        (now.getTime() - new Date(appeal.dueAt!).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine target: if assigned to user, notify them; otherwise notify secretary role
      const targetUserId = appeal.assignedToUserId ?? appeal.assigneeUserId ?? null;
      const targetRole: Role | null = targetUserId ? null : "secretary";

      // Create internal notification
      try {
        const notification = createNotification({
          type: "appeal.overdue",
          title: `Просрочено обращение: ${appeal.title}`,
          message: `Обращение "${appeal.title}" просрочено на ${overdueDays} ${getDaysWord(overdueDays)}. Срок: ${new Date(appeal.dueAt!).toLocaleDateString("ru-RU")}.`,
          targetUserId,
          targetRole,
          appealId: appeal.id,
          meta: {
            overdueDays,
            dueAt: appeal.dueAt,
            status: appeal.status,
            plotNumber: appeal.plotNumber,
            authorName: appeal.authorName,
          },
        });
        created.push(notification.id);
      } catch (error) {
        skipped.push(appeal.id);
      }
    }

    // Log audit event
    logAuditEvent({
      action: "appeals.remindOverdue",
      actorId: session.id,
      actorRole: role,
      requestId,
      targetType: "appeals",
      targetId: "bulk",
      details: {
        totalOverdue: overdueAppeals.length,
        notificationsCreated: created.length,
        notificationsSkipped: skipped.length,
      },
    });

    logStructured("info", {
      action: "appeals_reminders_run_complete",
      userId: session.id,
      notificationsCreated: created.length,
      notificationsSkipped: skipped.length,
      latencyMs: Date.now() - startedAt,
      requestId,
    });

    return ok(request, {
      jobType: "appeals.remindOverdue",
      overdueCount: overdueAppeals.length,
      notificationsCreated: created.length,
      notificationsSkipped: skipped.length,
      appealIds: overdueAppeals.map((a) => a.id),
    });
  } catch (error) {
    return serverError(request, "Ошибка запуска напоминаний", error);
  }
}

// Helper for Russian plural forms
function getDaysWord(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "дней";
  }
  if (lastDigit === 1) {
    return "день";
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return "дня";
  }
  return "дней";
}
