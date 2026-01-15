"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addAppealComment, type AppealStatus, createAppeal } from "@/lib/appeals.store";
import { setAppealAssignee, setAppealDue, updateAppealStatus } from "@/lib/office/appeals.server";
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
  createAppeal({ title, body });
  revalidatePath("/office/appeals");
  redirect("/office/appeals");
}

export async function assignAppealAction(formData: FormData) {
  const role = await assertOfficeRole();
  if (!hasPermission(role, "appeals.manage")) redirect("/forbidden");
  const id = (formData.get("id") as string | null) ?? "";
  const assigneeRole = (formData.get("assigneeRole") as string | null) ?? "";
  if (!id) return;
  const normalizedAssignee =
    assigneeRole === "chairman" || assigneeRole === "secretary" || assigneeRole === "accountant" || assigneeRole === "admin"
      ? assigneeRole
      : undefined;
  setAppealAssignee(id, normalizedAssignee);
  revalidatePath("/office/appeals");
  revalidatePath(`/office/appeals/${id}`);
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
