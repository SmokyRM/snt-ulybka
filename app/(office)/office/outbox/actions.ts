"use server";

import { redirect } from "next/navigation";

import { getEffectiveSessionUser } from "@/lib/session.server";
import { hasPermission, isOfficeRole } from "@/lib/rbac";
import { markOutboxRetry, processOutbox } from "@/lib/office/appeals.server";
import { revalidatePath } from "next/cache";

export async function processOutboxAction() {
  const session = await getEffectiveSessionUser();
  const role = session?.role;
  const isManager = role === "admin" || role === "chairman" || role === "secretary";
  if (!isOfficeRole(role) || !hasPermission(role, "office.view") || !isManager) {
    redirect("/forbidden");
  }
  await processOutbox();
  revalidatePath("/office/outbox");
}

export async function retryOutboxAction(formData: FormData) {
  const session = await getEffectiveSessionUser();
  const role = session?.role;
  const isManager = role === "admin" || role === "chairman" || role === "secretary";
  if (!isOfficeRole(role) || !hasPermission(role, "office.view") || !isManager) {
    redirect("/forbidden");
  }
  const id = String(formData.get("id") ?? "");
  if (id) {
    markOutboxRetry(id);
  }
  revalidatePath("/office/outbox");
}
