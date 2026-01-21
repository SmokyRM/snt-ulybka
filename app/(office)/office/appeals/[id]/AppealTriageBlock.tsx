"use client";

import type { ActivityLogEntry } from "@/lib/activityLog.store";

type Props = {
  logs: ActivityLogEntry[];
  appealId: string;
};

const roleLabels: Record<string, string> = {
  chairman: "Председатель",
  secretary: "Секретарь",
  accountant: "Бухгалтер",
  admin: "Администратор",
};

const statusLabels: Record<string, string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_info: "Требует уточнения",
  closed: "Закрыто",
};

/**
 * Форматирует список изменений из правила триажа
 */
function formatChanges(changes: Record<string, unknown> | undefined): string[] {
  if (!changes) return [];
  
  const changeParts: string[] = [];
  
  if (changes.assignRole) {
    const role = changes.assignRole as string;
    changeParts.push(`назначено роли "${roleLabels[role] || role}"`);
  }
  
  if (changes.status) {
    const status = changes.status as string;
    changeParts.push(`статус: "${statusLabels[status] || status}"`);
  }
  
  if (changes.dueAt) {
    const dueAt = changes.dueAt as string;
    const date = new Date(dueAt).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    changeParts.push(`срок: ${date}`);
  }
  
  return changeParts;
}

export default function AppealTriageBlock({ logs, appealId }: Props) {
  // Находим последнюю запись с action="system_rule_applied"
  const lastRuleLog = logs.find((log) => log.action === "system_rule_applied");
  
  if (!lastRuleLog) {
    return null;
  }
  
  const meta = lastRuleLog.meta || {};
  const ruleTitle = (meta.ruleTitle as string) || (meta.ruleName as string) || "Неизвестное правило";
  const changes = meta.changes as Record<string, unknown> | undefined;
  const changeParts = formatChanges(changes);
  
  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3" data-testid="appeal-triage-root">
      <div className="text-sm font-semibold text-blue-800 mb-2">Авто-триаж</div>
      <div className="text-sm text-blue-700" data-testid="appeal-triage-last-rule">
        <div className="font-medium">Применено правило: {ruleTitle}</div>
        {changeParts.length > 0 && (
          <div className="mt-1 text-xs text-blue-600">
            {changeParts.join(", ")}
          </div>
        )}
      </div>
      <a
        href="#activity-feed?filter=system"
        onClick={(e) => {
          e.preventDefault();
          window.location.hash = "#activity-feed?filter=system";
          // Прокручиваем к ленте активности
          const element = document.getElementById("activity-feed");
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }}
        className="mt-2 inline-block text-xs text-blue-600 underline hover:text-blue-800"
        data-testid="appeal-triage-show-all"
      >
        Показать все системные события →
      </a>
    </div>
  );
}
