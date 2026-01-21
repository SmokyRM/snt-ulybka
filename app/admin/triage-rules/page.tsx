import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { TRIAGE_RULES } from "@/config/triageRules";
import type { TriageRule } from "@/config/triageRules";

const categoryLabels: Record<string, string> = {
  finance: "Финансы",
  electricity: "Электроэнергия",
  documents: "Документы",
  access: "Доступ",
  membership: "Членство",
  insufficient_data: "Недостаточно данных",
  general: "Общее",
};

const priorityLabels: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

const channelLabels: Record<string, string> = {
  none: "Нет",
  site: "Сайт",
  email: "Email",
  telegram: "Telegram",
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
 * Форматирует условие правила (when) в человекочитаемый вид
 */
function formatCondition(when: TriageRule["when"]): string[] {
  const conditions: string[] = [];

  if (when.type) {
    conditions.push(`Тип: ${categoryLabels[when.type] || when.type}`);
  }

  if (when.priority) {
    conditions.push(`Приоритет: ${priorityLabels[when.priority] || when.priority}`);
  }

  if (when.keywords && when.keywords.length > 0) {
    conditions.push(`Ключевые слова: ${when.keywords.join(", ")}`);
  }

  if (when.channel) {
    conditions.push(`Канал: ${channelLabels[when.channel] || when.channel}`);
  }

  if (when.hasDebt !== undefined) {
    conditions.push(`Долг: ${when.hasDebt ? "есть" : "нет"}`);
  }

  if (when.amountGt !== undefined) {
    conditions.push(`Сумма долга > ${when.amountGt.toLocaleString("ru-RU")} ₽`);
  }

  return conditions.length > 0 ? conditions : ["Любое обращение"];
}

/**
 * Форматирует действие правила (then) в человекочитаемый вид
 */
function formatAction(then: TriageRule["then"]): string[] {
  const actions: string[] = [];

  if (then.assignRole) {
    actions.push(`Назначить роль: ${roleLabels[then.assignRole] || then.assignRole}`);
  }

  if (then.setStatus) {
    actions.push(`Установить статус: ${statusLabels[then.setStatus] || then.setStatus}`);
  }

  if (then.setDueAtRule !== undefined) {
    const hours = then.setDueAtRule;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    let timeText = "";
    if (days > 0 && remainingHours > 0) {
      timeText = `${days} дн. ${remainingHours} ч.`;
    } else if (days > 0) {
      timeText = `${days} дн.`;
    } else {
      timeText = `${hours} ч.`;
    }
    actions.push(`Установить срок: ${timeText}`);
  }

  if (then.addTag) {
    actions.push(`Добавить тег: ${then.addTag}`);
  }

  return actions.length > 0 ? actions : ["Нет действий"];
}

export default async function AdminTriageRulesPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/staff/login?next=/admin/triage-rules");
  }

  // RBAC: только admin/chairman
  if (!user || (user.role !== "admin" && user.role !== "chairman")) {
    redirect("/forbidden?reason=admin.only");
  }

  // Сортируем правила по order
  const sortedRules = [...TRIAGE_RULES].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900">Правила авто-триажа</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Правила применяются по порядку (order), первое совпадение выполняется. Правила с меньшим order применяются раньше.
          </p>
        </div>

        <div className="space-y-4" data-testid="triage-rules-root">
          {sortedRules.map((rule) => {
            const conditions = formatCondition(rule.when);
            const actions = formatAction(rule.then);
            const isEnabled = rule.enabled !== false;

            return (
              <div
                key={rule.id}
                className={`rounded-xl border bg-white p-5 shadow-sm ${
                  isEnabled ? "border-zinc-200" : "border-zinc-300 bg-zinc-50 opacity-75"
                }`}
                data-testid={`triage-rule-row-${rule.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-zinc-900">{rule.title}</h3>
                      {!isEnabled && (
                        <span className="inline-flex items-center rounded-full bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-700">
                          Отключено
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">ID: {rule.id}</span>
                      <span className="text-xs text-zinc-500">Order: {rule.order ?? 100}</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Условия (when) */}
                      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                        <div className="mb-2 text-sm font-semibold text-blue-900">Условие (если):</div>
                        <ul className="space-y-1 text-sm text-blue-800">
                          {conditions.map((condition, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>{condition}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Действия (then) */}
                      <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3">
                        <div className="mb-2 text-sm font-semibold text-green-900">Действие (то):</div>
                        <ul className="space-y-1 text-sm text-green-800">
                          {actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-600">→</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {sortedRules.length === 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-600">
            Правила не найдены
          </div>
        )}
      </div>
    </main>
  );
}
