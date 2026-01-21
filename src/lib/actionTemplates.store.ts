import "server-only";

import type { Role } from "@/lib/permissions";
import type { AppealStatus, AppealCategory } from "@/lib/office/types";

export type ActionTemplate = {
  key: string; // Уникальный ключ шаблона (например, "request_info", "close_template", "transfer_to_accountant")
  title: string; // Название шаблона для UI
  body: string; // Текст шаблона (может содержать переменные)
  allowedRoles: Role[]; // Роли, которым разрешено использовать этот шаблон
  statusChange?: AppealStatus; // Новый статус обращения (если нужно изменить)
  typeChange?: AppealCategory; // Новый тип обращения (если нужно изменить)
  assignToRole?: Role; // Роль для назначения (если нужно)
};

// In-memory store для шаблонов действий
const actionTemplates: ActionTemplate[] = [
  {
    key: "reply_template",
    title: "Ответ по шаблону",
    body: "Спасибо за ваше обращение. Рассмотрели ваш вопрос и подготовили ответ:\n\n[Текст ответа]\n\nЕсли у вас возникнут дополнительные вопросы, пожалуйста, свяжитесь с нами.",
    allowedRoles: ["secretary", "chairman", "admin"],
  },
  {
    key: "request_info",
    title: "Запросить уточнение",
    body: "Для решения вашего обращения необходимы дополнительные данные. Пожалуйста, уточните:\n\n- [Укажите, какие данные нужны]\n\nПосле получения информации мы продолжим работу над обращением.",
    allowedRoles: ["secretary", "chairman", "admin"],
    statusChange: "needs_info",
  },
  {
    key: "transfer_to_accountant",
    title: "Передать в бухгалтерию",
    body: "Ваше обращение передано в бухгалтерию для рассмотрения. Специалист свяжется с вами в ближайшее время.",
    allowedRoles: ["secretary", "chairman", "admin"],
    typeChange: "finance",
    assignToRole: "accountant",
  },
  {
    key: "close_template",
    title: "Закрыть по шаблону",
    body: "Ваше обращение рассмотрено и закрыто. Если у вас возникнут дополнительные вопросы, пожалуйста, создайте новое обращение.",
    allowedRoles: ["secretary", "chairman", "admin"],
    statusChange: "closed",
  },
];

/**
 * Получить все шаблоны действий, доступные для роли
 */
export function getActionTemplates(role: Role): ActionTemplate[] {
  return actionTemplates.filter((template) => template.allowedRoles.includes(role));
}

/**
 * Получить шаблон действия по ключу
 */
export function getActionTemplate(key: string): ActionTemplate | null {
  return actionTemplates.find((template) => template.key === key) ?? null;
}

/**
 * Применить переменные к тексту шаблона
 * Поддерживаемые переменные:
 * - {{appealTitle}} - название обращения
 * - {{plotNumber}} - номер участка
 * - {{authorName}} - имя автора
 */
export function renderActionTemplate(
  template: ActionTemplate,
  context: {
    appealTitle?: string;
    plotNumber?: string;
    authorName?: string;
  }
): string {
  let text = template.body;
  
  if (context.appealTitle) {
    text = text.replace(/\{\{appealTitle\}\}/g, context.appealTitle);
  }
  if (context.plotNumber) {
    text = text.replace(/\{\{plotNumber\}\}/g, context.plotNumber);
  }
  if (context.authorName) {
    text = text.replace(/\{\{authorName\}\}/g, context.authorName);
  }
  
  return text;
}
