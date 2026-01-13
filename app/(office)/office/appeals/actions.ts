"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { addAppealComment, updateAppealStatus, type AppealStatus, createAppeal } from "@/lib/appeals.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";

const assertOfficeRole = async () => {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "accountant" || role === "secretary" || role === "admin")) {
    redirect("/forbidden");
  }
  return true;
};

export async function saveStatusAction(formData: FormData) {
  await assertOfficeRole();
  const id = formData.get("id") as string;
  const status = formData.get("status") as AppealStatus;
  if (!id || !status) return;
  updateAppealStatus(id, status);
  revalidatePath("/office/appeals");
  revalidatePath(`/office/appeals/${id}`);
}

export async function sendReplyAction(formData: FormData) {
  await assertOfficeRole();
  const id = formData.get("id") as string;
  const text = (formData.get("reply") as string | null) ?? "";
  if (!id) return;
  addAppealComment(id, text, "office");
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
