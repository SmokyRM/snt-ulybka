"use server";

import { redirect } from "next/navigation";
import { createAppeal } from "@/lib/appeals.store";

export async function createAppealAction(formData: FormData) {
  const title = ((formData.get("title") as string | null) ?? "").trim();
  const body = ((formData.get("body") as string | null) ?? "").trim();
  const authorId = (formData.get("authorId") as string | null) ?? undefined;
  const authorName = (formData.get("authorName") as string | null) ?? undefined;
  if (!title || !body) {
    return;
  }
  const appeal = await createAppeal({ title, body, authorId, authorName });
  redirect(`/cabinet/appeals/${appeal.id}`);
}
