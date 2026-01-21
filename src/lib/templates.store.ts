import "server-only";

import { getDb } from "./mockDb";
import type { Template } from "./office/types";
import type { AppealStatus } from "./office/types";
import { createId } from "./mockDb";

/**
 * Sprint 5.4: Store для шаблонов действий/ответов
 */

// Дефолтные шаблоны
const defaultTemplates: Omit<Template, "id" | "createdAt" | "updatedAt">[] = [
  {
    key: "reply_template",
    title: "Ответ по шаблону",
    body: "Спасибо за ваше обращение. Рассмотрели ваш вопрос и подготовили ответ:\n\n[Текст ответа]\n\nЕсли у вас возникнут дополнительные вопросы, пожалуйста, свяжитесь с нами.",
    allowedRoles: ["secretary", "chairman", "admin"],
    actions: {
      addComment: true,
    },
  },
  {
    key: "request_info",
    title: "Запросить уточнение",
    body: "Для решения вашего обращения необходимы дополнительные данные. Пожалуйста, уточните:\n\n- [Укажите, какие данные нужны]\n\nПосле получения информации мы продолжим работу над обращением.",
    allowedRoles: ["secretary", "chairman", "admin"],
    actions: {
      setStatus: "needs_info",
      addComment: true,
    },
  },
  {
    key: "transfer_to_accountant",
    title: "Передать в бухгалтерию",
    body: "Ваше обращение передано в бухгалтерию для рассмотрения. Специалист свяжется с вами в ближайшее время.",
    allowedRoles: ["secretary", "chairman", "admin"],
    actions: {
      assignRole: "accountant",
      addComment: true,
    },
  },
  {
    key: "close_template",
    title: "Закрыть по шаблону",
    body: "Ваше обращение рассмотрено и закрыто. Если у вас возникнут дополнительные вопросы, пожалуйста, создайте новое обращение.",
    allowedRoles: ["secretary", "chairman", "admin"],
    actions: {
      setStatus: "closed",
      addComment: true,
    },
  },
];

/**
 * Инициализирует дефолтные шаблоны (если их еще нет)
 */
function ensureDefaultTemplates() {
  const db = getDb();
  if (db.templates.length === 0) {
    const now = new Date().toISOString();
    db.templates = defaultTemplates.map((t) => ({
      ...t,
      id: createId("template"),
      createdAt: now,
      updatedAt: now,
    }));
  }
}

/**
 * Получить все шаблоны
 */
export function listTemplates(): Template[] {
  ensureDefaultTemplates();
  const db = getDb();
  return [...db.templates].sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Получить шаблон по ключу
 */
export function getTemplateByKey(key: string): Template | null {
  ensureDefaultTemplates();
  const db = getDb();
  return db.templates.find((t) => t.key === key) ?? null;
}

/**
 * Получить шаблон по ID
 */
export function getTemplateById(id: string): Template | null {
  ensureDefaultTemplates();
  const db = getDb();
  return db.templates.find((t) => t.id === id) ?? null;
}

/**
 * Получить шаблоны, доступные для роли
 */
export function getTemplatesForRole(role: string): Template[] {
  ensureDefaultTemplates();
  const db = getDb();
  return db.templates.filter((t) => t.allowedRoles.includes(role));
}

/**
 * Создать шаблон
 */
export function createTemplate(input: {
  key: string;
  title: string;
  body: string;
  allowedRoles: string[];
  actions: {
    setStatus?: AppealStatus;
    assignRole?: "chairman" | "secretary" | "accountant" | "admin";
    addComment?: boolean;
  };
}): Template {
  ensureDefaultTemplates();
  const db = getDb();
  
  // Проверка уникальности key
  if (db.templates.some((t) => t.key === input.key)) {
    throw new Error(`Template with key "${input.key}" already exists`);
  }
  
  const now = new Date().toISOString();
  const template: Template = {
    id: createId("template"),
    key: input.key.trim(),
    title: input.title.trim(),
    body: input.body.trim(),
    allowedRoles: input.allowedRoles,
    actions: input.actions,
    createdAt: now,
    updatedAt: now,
  };
  
  db.templates.push(template);
  return template;
}

/**
 * Обновить шаблон
 */
export function updateTemplate(
  id: string,
  input: {
    key?: string;
    title?: string;
    body?: string;
    allowedRoles?: string[];
    actions?: {
      setStatus?: AppealStatus;
      assignRole?: "chairman" | "secretary" | "accountant" | "admin";
      addComment?: boolean;
    };
  }
): Template {
  ensureDefaultTemplates();
  const db = getDb();
  const index = db.templates.findIndex((t) => t.id === id);
  
  if (index === -1) {
    throw new Error(`Template with id "${id}" not found`);
  }
  
  const existing = db.templates[index];
  
  // Проверка уникальности key (если меняется)
  if (input.key && input.key !== existing.key) {
    if (db.templates.some((t) => t.key === input.key && t.id !== id)) {
      throw new Error(`Template with key "${input.key}" already exists`);
    }
  }
  
  const updated: Template = {
    ...existing,
    ...(input.key !== undefined && { key: input.key.trim() }),
    ...(input.title !== undefined && { title: input.title.trim() }),
    ...(input.body !== undefined && { body: input.body.trim() }),
    ...(input.allowedRoles !== undefined && { allowedRoles: input.allowedRoles }),
    ...(input.actions !== undefined && { actions: input.actions }),
    updatedAt: new Date().toISOString(),
  };
  
  db.templates[index] = updated;
  return updated;
}

/**
 * Удалить шаблон
 */
export function deleteTemplate(id: string): void {
  ensureDefaultTemplates();
  const db = getDb();
  const index = db.templates.findIndex((t) => t.id === id);
  
  if (index === -1) {
    throw new Error(`Template with id "${id}" not found`);
  }
  
  db.templates.splice(index, 1);
}
