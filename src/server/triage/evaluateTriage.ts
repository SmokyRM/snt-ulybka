import type { Appeal } from "@/lib/office/types";
import type { TriageRule, TriageRuleCondition, TriageRuleAction } from "@/config/triageRules";
import { TRIAGE_RULES } from "@/config/triageRules";
import { logTriageMatched, logTriageSkipped } from "./logTriageActivity";

/**
 * Контекст для оценки триажа обращения
 */
export type TriageContext = {
  /** Есть ли долг у автора обращения */
  hasDebt?: boolean;
  /** Сумма долга (в рублях) */
  debtAmount?: number;
  /** Канал обращения */
  channel?: "none" | "site" | "email" | "telegram";
};

/**
 * Результат оценки триажа
 */
export type TriageEvaluationResult = {
  /** ID правила, которое сработало (null если ни одно не подошло) */
  matchedRuleId: string | null;
  /** Действия, которые нужно выполнить */
  actions: TriageRuleAction;
  /** Объяснение, почему правило сработало (или почему не сработало ни одно) */
  explanation: string;
};

/**
 * Проверяет условие правила триажа
 */
function matchesCondition(
  condition: TriageRuleCondition,
  appeal: Appeal,
  ctx: TriageContext
): boolean {
  // Проверка типа обращения
  if (condition.type !== undefined && appeal.type !== condition.type) {
    return false;
  }

  // Проверка приоритета
  if (condition.priority !== undefined && appeal.priority !== condition.priority) {
    return false;
  }

  // Проверка ключевых слов
  if (condition.keywords !== undefined && condition.keywords.length > 0) {
    const text = `${appeal.title} ${appeal.body}`.toLowerCase();
    const hasKeyword = condition.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    if (!hasKeyword) {
      return false;
    }
  }

  // Проверка канала
  if (condition.channel !== undefined) {
    // Канал может быть в ctx или нужно определить из других полей appeal
    if (ctx.channel !== condition.channel) {
      return false;
    }
  }

  // Проверка наличия долга
  if (condition.hasDebt !== undefined) {
    const actualHasDebt = ctx.hasDebt ?? false;
    if (actualHasDebt !== condition.hasDebt) {
      return false;
    }
  }

  // Проверка суммы долга
  if (condition.amountGt !== undefined) {
    const actualDebtAmount = ctx.debtAmount ?? 0;
    if (actualDebtAmount <= condition.amountGt) {
      return false;
    }
  }

  return true;
}

/**
 * Формирует объяснение, почему правило сработало
 */
function buildExplanation(rule: TriageRule, appeal: Appeal, ctx: TriageContext): string {
  const parts: string[] = [];
  
  if (rule.when.type) {
    parts.push(`тип обращения: ${rule.when.type}`);
  }
  if (rule.when.priority) {
    parts.push(`приоритет: ${rule.when.priority}`);
  }
  if (rule.when.keywords && rule.when.keywords.length > 0) {
    parts.push(`ключевые слова: ${rule.when.keywords.slice(0, 3).join(", ")}`);
  }
  if (rule.when.channel) {
    parts.push(`канал: ${rule.when.channel}`);
  }
  if (rule.when.hasDebt !== undefined) {
    parts.push(`долг: ${rule.when.hasDebt ? "есть" : "нет"}`);
  }
  if (rule.when.amountGt !== undefined) {
    parts.push(`долг > ${rule.when.amountGt} руб.`);
  }

  return `Правило "${rule.title}" сработало по условиям: ${parts.join(", ")}`;
}

/**
 * Оценивает триаж обращения на основе правил
 * Возвращает первое правило, которое соответствует условиям
 * 
 * @param appeal - обращение для триажа
 * @param ctx - контекст триажа (канал, долг и т.д.)
 * @param options - опции (logActivity - логировать ли события в ActivityLog)
 */
export function evaluateTriage(
  appeal: Appeal,
  ctx: TriageContext = {},
  options: { logActivity?: boolean } = {}
): TriageEvaluationResult {
  const { logActivity: shouldLog = false } = options;

  // Получаем включенные правила, отсортированные по order
  const enabledRules = TRIAGE_RULES.filter((rule) => rule.enabled !== false)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  // Проверяем правила по порядку
  for (const rule of enabledRules) {
    if (matchesCondition(rule.when, appeal, ctx)) {
      const result: TriageEvaluationResult = {
        matchedRuleId: rule.id,
        actions: rule.then,
        explanation: buildExplanation(rule, appeal, ctx),
      };

      // Логируем событие triage.matched, если нужно
      if (shouldLog) {
        logTriageMatched(appeal, result);
      }

      // Проверяем, есть ли реальные действия
      const hasActions = Boolean(
        result.actions.assignRole ||
        result.actions.setStatus ||
        result.actions.setDueAtRule !== undefined ||
        result.actions.addTag
      );

      // Если действий нет, логируем triage.skipped
      if (shouldLog && !hasActions) {
        logTriageSkipped(appeal, result, "rule_matched_but_no_actions");
      }

      return result;
    }
  }

  // Ни одно правило не сработало
  const result: TriageEvaluationResult = {
    matchedRuleId: null,
    actions: {},
    explanation: "Ни одно правило триажа не подошло. Используются значения по умолчанию.",
  };

  // Логируем triage.skipped, если нужно
  if (shouldLog) {
    logTriageSkipped(appeal, result, "no_rule_matched");
  }

  return result;
}
