"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addAppealComment, type AppealStatus, createAppeal } from "@/lib/appeals.store";
import { setAppealDue, updateAppealStatus } from "@/lib/office/appeals.server";
import {
  assignToMe,
  unassignAppeal,
  assignToUser,
  assignToRole,
} from "@/server/services/appeals";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

const assertOfficeRole = async () => {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!hasPermission(role, "office.view")) {
    redirect("/forbidden");
  }
  return role;
};

export async function saveStatusAction(formData: FormData) {
  const role = await assertOfficeRole();
  const id = formData.get("id") as string;
  const status = formData.get("status") as AppealStatus;
  if (!id || !status) return;
  if (!hasPermission(role, "appeals.manage")) {
    redirect("/forbidden");
  }
  updateAppealStatus(id, status, role === "admin" || role === "chairman" || role === "accountant" || role === "secretary" ? role : undefined);
  revalidatePath("/office/appeals");
  revalidatePath(`/office/appeals/${id}`);
}

export async function sendReplyAction(formData: FormData) {
  const role = await assertOfficeRole();
  const id = formData.get("id") as string;
  const text = (formData.get("reply") as string | null) ?? "";
  if (!id) return;
  if (!hasPermission(role, "appeals.manage")) redirect("/forbidden");
  addAppealComment(id, role === "admin" || role === "chairman" || role === "accountant" || role === "secretary" ? role : "secretary", text);
  revalidatePath("/office/appeals");
  revalidatePath(`/office/appeals/${id}`);
}

export async function createAppealAction(formData: FormData) {
  await assertOfficeRole();
  const title = ((formData.get("title") as string | null) ?? "").trim();
  const body = ((formData.get("body") as string | null) ?? "").trim();
  if (!title || !body) return;
  await createAppeal({ title, body });
  revalidatePath("/office/appeals");
  redirect("/office/appeals");
}

/**
 * Назначить обращение себе
 */
export async function assignToMeAction(formData: FormData) {
  await assertOfficeRole();
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return;
  try {
    await assignToMe(id);
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${id}`);
    revalidatePath("/office/inbox");
  } catch (error) {
    // Ошибки обрабатываются на уровне сервиса (UNAUTHORIZED, FORBIDDEN, NOT_FOUND)
    throw error;
  }
}

/**
 * Снять назначение с обращения
 */
export async function unassignAppealAction(formData: FormData) {
  await assertOfficeRole();
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return;
  try {
    await unassignAppeal(id);
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${id}`);
    revalidatePath("/office/inbox");
  } catch (error) {
    throw error;
  }
}

/**
 * Назначить обращение конкретному пользователю
 */
export async function assignToUserAction(formData: FormData) {
  await assertOfficeRole();
  const id = (formData.get("id") as string | null) ?? "";
  const targetUserId = (formData.get("targetUserId") as string | null) ?? "";
  if (!id || !targetUserId) return;
  try {
    await assignToUser(id, targetUserId);
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${id}`);
    revalidatePath("/office/inbox");
  } catch (error) {
    throw error;
  }
}

/**
 * Назначить обращение роли
 */
export async function assignToRoleAction(formData: FormData) {
  await assertOfficeRole();
  const id = (formData.get("id") as string | null) ?? "";
  const targetRole = (formData.get("targetRole") as string | null) ?? "";
  if (!id || !targetRole) return;
  
  const normalizedRole: "chairman" | "secretary" | "accountant" | "admin" | null =
    targetRole === "chairman" || targetRole === "secretary" || targetRole === "accountant" || targetRole === "admin"
      ? targetRole
      : null;
  
  if (!normalizedRole) return;
  
  try {
    await assignToRole(id, normalizedRole);
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${id}`);
    revalidatePath("/office/inbox");
  } catch (error) {
    throw error;
  }
}

/**
 * @deprecated Используйте assignToMeAction, assignToUserAction или assignToRoleAction
 */
export async function assignAppealAction(formData: FormData) {
  const role = await assertOfficeRole();
  if (!hasPermission(role, "appeals.manage")) redirect("/forbidden");
  const id = (formData.get("id") as string | null) ?? "";
  const assigneeRole = (formData.get("assigneeRole") as string | null) ?? "";
  if (!id) return;
  const normalizedRole: "chairman" | "secretary" | "accountant" | "admin" | null =
    assigneeRole === "chairman" || assigneeRole === "secretary" || assigneeRole === "accountant" || assigneeRole === "admin"
      ? assigneeRole
      : null;
  if (normalizedRole) {
    await assignToRoleAction(formData);
  }
}

export async function setDueDateAction(formData: FormData) {
  const role = await assertOfficeRole();
  if (!hasPermission(role, "appeals.manage")) redirect("/forbidden");
  const id = (formData.get("id") as string | null) ?? "";
  const due = (formData.get("dueAt") as string | null) ?? "";
  if (!id) return;
  setAppealDue(id, due ? new Date(due).toISOString() : null);
  revalidatePath("/office/appeals");
  revalidatePath(`/office/appeals/${id}`);
}

/**
 * Sprint 5.4: Применить шаблон действия к обращению
 */
export async function applyTemplateAction(formData: FormData) {
  const role = await assertOfficeRole();
  if (!hasPermission(role, "appeals.manage")) redirect("/forbidden");
  const id = (formData.get("id") as string | null) ?? "";
  const templateKey = (formData.get("templateKey") as string | null) ?? "";
  if (!id || !templateKey) return;
  
  try {
    const { applyTemplateToAppeal } = await import("@/server/services/appealTemplates");
    await applyTemplateToAppeal({ appealId: id, templateKey });
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${id}`);
    revalidatePath("/office/inbox");
    redirect(`/office/appeals/${id}?success=template_applied`);
  } catch (error) {
    // Ошибки обрабатываются на уровне сервиса
    throw error;
  }
}
