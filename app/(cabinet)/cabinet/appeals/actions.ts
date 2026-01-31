"use server";

import { redirect } from "next/navigation";
import { createAppeal } from "@/lib/appeals.store";
import { getSessionUser } from "@/lib/session.server";

export async function createAppealAction(formData: FormData) {
  const title = ((formData.get("title") as string | null) ?? "").trim();
  const body = ((formData.get("body") as string | null) ?? "").trim();
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/cabinet/appeals/new");
  }
  const authorId = user.id;
  const authorName = user.fullName ?? user.email ?? user.phone ?? undefined;
  const plotNumber =
    user.plotNumber && user.street ? `${user.street}, ${user.plotNumber}` : user.plotNumber ?? undefined;
  const authorPhone = user.phone ?? undefined;
  if (!title || !body) {
    return;
  }
  const appeal = await createAppeal({ title, body, authorId, authorName, plotNumber, authorPhone });
  redirect(`/cabinet/appeals/${appeal.id}`);
}
