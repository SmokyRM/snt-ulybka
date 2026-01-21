import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activityLog.store";
import { randomUUID } from "node:crypto";

export type OfficeTemplate = {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

type CreateInput = {
  title: string;
  content: string;
  category?: string;
};

type UpdateInput = {
  title?: string;
  content?: string;
  category?: string;
};

// In-memory store (в будущем можно заменить на БД)
const templates: OfficeTemplate[] = [
  {
    id: randomUUID(),
    title: "Стандартный ответ по начислениям",
    content: "По вашему обращению по начислениям. Проверим данные и вернёмся с ответом.",
    category: "Начисления",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    createdBy: "secretary",
  },
  {
    id: randomUUID(),
    title: "Ответ по показаниям",
    content: "Показания получены. Начисления будут обновлены в ближайшее время.",
    category: "Показания",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    createdBy: "secretary",
  },
];

export async function listTemplates(): Promise<OfficeTemplate[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  
  // accountant по умолчанию hidden
  if (role === "accountant") {
    return [];
  }
  
  try {
    assertCan(role, "templates.read", undefined);
  } catch {
    // Если нет прав на чтение, возвращаем пустой массив
    return [];
  }

  return [...templates].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getTemplate(id: string): Promise<OfficeTemplate | null> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  
  // accountant по умолчанию hidden
  if (role === "accountant") {
    return null;
  }
  
  try {
    assertCan(role, "templates.read", undefined);
  } catch {
    return null;
  }

  return templates.find((t) => t.id === id) ?? null;
}

export async function createTemplate(params: CreateInput): Promise<OfficeTemplate> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "templates.manage", undefined);

  const now = new Date().toISOString();
  const template: OfficeTemplate = {
    id: randomUUID(),
    title: params.title.trim(),
    content: params.content.trim(),
    category: params.category?.trim(),
    createdAt: now,
    updatedAt: now,
    createdBy: role === "admin" ? "admin" : role === "secretary" ? "secretary" : "chairman",
  };

  templates.push(template);

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "template",
    entityId: template.id,
    action: "create",
    payload: {
      title: template.title,
    },
  });

  return template;
}

export async function updateTemplate(id: string, params: UpdateInput): Promise<OfficeTemplate> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "templates.manage", undefined);

  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error("NOT_FOUND");
  }

  const existing = templates[idx];
  const updated: OfficeTemplate = {
    ...existing,
    ...(params.title !== undefined && { title: params.title.trim() }),
    ...(params.content !== undefined && { content: params.content.trim() }),
    ...(params.category !== undefined && { category: params.category?.trim() }),
    updatedAt: new Date().toISOString(),
  };

  templates[idx] = updated;

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "template",
    entityId: id,
    action: "update",
    payload: {
      changes: Object.keys(params),
    },
  });

  return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "templates.manage", undefined);

  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error("NOT_FOUND");
  }

  const deletedTitle = templates[idx].title;
  templates.splice(idx, 1);

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "template",
    entityId: id,
    action: "delete",
    payload: {
      title: deletedTitle,
    },
  });
}
