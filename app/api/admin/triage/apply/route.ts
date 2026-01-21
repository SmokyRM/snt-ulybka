import { badRequest, fail, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/session.server";
import { getAppeal, updateAppealStatus, setAppealAssignee, setAppealDue } from "@/lib/appeals.store";
import { evaluateTriage } from "@/server/triage/evaluateTriage";
import { logTriageApplied, logTriageSkipped } from "@/server/triage/logTriageActivity";
import type { TriageContext } from "@/server/triage/evaluateTriage";
import { getUserFinanceInfo } from "@/lib/getUserFinanceInfo";

/**
 * Проверяет, есть ли у пользователя доступ к триажу (admin или chairman)
 */
function hasTriageAccess(user: { role: string } | null | undefined): boolean {
  if (!user) return false;
  const role = user.role;
  return role === "admin" || role === "chairman";
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }
  if (!hasTriageAccess(user)) {
    return forbidden(request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const appealId = typeof body.appealId === "string" ? body.appealId : null;

    if (!appealId) {
      return badRequest(request, "appealId_required");
    }

    // Получаем обращение
    const appeal = getAppeal(appealId);
    if (!appeal) {
      return fail(request, "not_found", "appeal_not_found", 404);
    }

  // Сохраняем состояние обращения до применения триажа
  const appealBefore = { ...appeal };

  // Формируем контекст для триажа
  const triageContext: TriageContext = {
    channel: "site", // По умолчанию обращение создано через сайт
    hasDebt: false,
    debtAmount: 0,
  };

  // Если есть authorId, пытаемся получить информацию о долге
  if (appeal.authorId) {
    try {
      const finance = await getUserFinanceInfo(appeal.authorId);
      const totalDebt = (finance.membershipDebt ?? 0) + (finance.electricityDebt ?? 0);
      triageContext.hasDebt = totalDebt > 0;
      triageContext.debtAmount = totalDebt;
    } catch (error) {
      // Игнорируем ошибки получения финансовой информации
      if (process.env.NODE_ENV !== "production") {
        console.error("[triage-apply] Failed to get finance info:", error);
      }
    }
  }

  // Оцениваем триаж (без логирования, логируем после применения)
  const triageResult = evaluateTriage(appeal, triageContext, { logActivity: false });

  // Применяем изменения к обращению
  const updatedAppeal = { ...appeal };
  let hasChanges = false;

  if (triageResult.matchedRuleId) {
    const actions = triageResult.actions;

    // Применяем assignRole (только если нет ручного назначения)
    if (actions.assignRole && !appeal.assignedToUserId) {
      const assigned = setAppealAssignee(appealId, actions.assignRole);
      if (assigned) {
        updatedAppeal.assigneeRole = assigned.assigneeRole;
        hasChanges = hasChanges || updatedAppeal.assigneeRole !== appealBefore.assigneeRole;
      }
    }

    // Применяем setStatus (только если статус ещё "new")
    if (actions.setStatus && appeal.status === "new") {
      try {
        const updated = updateAppealStatus(appealId, actions.setStatus);
        if (updated) {
          updatedAppeal.status = updated.status;
          hasChanges = hasChanges || updatedAppeal.status !== appealBefore.status;
        }
      } catch (error) {
        // Игнорируем ошибки обновления статуса (не критично)
        if (process.env.NODE_ENV !== "production") {
          console.error("[triage-apply] Failed to update status:", error);
        }
      }
    }

    // Применяем setDueAtRule (только если dueAtSource="auto" или dueAt не установлен)
    if (actions.setDueAtRule !== undefined) {
      if (appeal.dueAtSource === "auto" || !appeal.dueAt) {
        const dueDate = new Date();
        dueDate.setHours(dueDate.getHours() + actions.setDueAtRule);
        const updated = setAppealDue(appealId, dueDate.toISOString(), "auto");
        if (updated) {
          updatedAppeal.dueAt = updated.dueAt;
          updatedAppeal.dueAtSource = updated.dueAtSource;
          hasChanges = hasChanges || updatedAppeal.dueAt !== appealBefore.dueAt;
        }
      }
    }

    // Если есть изменения, логируем triage.applied
    if (hasChanges) {
      logTriageApplied(appealBefore, triageResult, updatedAppeal);
    } else {
      // Если правило совпало, но изменений нет, логируем skipped
      logTriageSkipped(updatedAppeal, triageResult, "rule_matched_but_no_actions");
    }
  } else {
    // Ни одно правило не совпало, логируем skipped
    logTriageSkipped(updatedAppeal, triageResult, "no_rule_matched");
  }

    // Получаем обновлённое обращение
    const finalAppeal = getAppeal(appealId);
    if (!finalAppeal) {
      return fail(request, "not_found", "appeal_not_found", 404);
    }

    return ok(request, {
      ok: true,
      appealId: finalAppeal.id,
      appeal: {
        id: finalAppeal.id,
        title: finalAppeal.title,
        type: finalAppeal.type,
        priority: finalAppeal.priority,
        status: finalAppeal.status,
        assigneeRole: finalAppeal.assigneeRole,
        dueAt: finalAppeal.dueAt,
      },
      triage: triageResult,
      applied: hasChanges,
    });
  } catch (error) {
    console.error("Error applying triage:", error);
    return serverError(request, "Ошибка применения triage", error);
  }
}
