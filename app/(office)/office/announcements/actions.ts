"use server";

import { redirect } from "next/navigation";
import { removeAnnouncement } from "@/lib/announcements.store";

export async function removeAnnouncementAction(formData: FormData) {
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return;
  removeAnnouncement(id);
  redirect("/office/announcements");
}
