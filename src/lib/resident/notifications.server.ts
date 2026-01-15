import "server-only";

import { redirect } from "next/navigation";

import { listResidentNotifications, markNotificationRead as markNotificationReadBase } from "../appeals.store";
import { getEffectiveSessionUser } from "../session.server";

export async function listMyNotifications() {
  const session = await getEffectiveSessionUser();
  if (!session || session.role !== "resident" || !session.id) {
    redirect("/forbidden");
  }
  return listResidentNotifications(session.id);
}

export async function markNotificationRead(id: string) {
  const session = await getEffectiveSessionUser();
  if (!session || session.role !== "resident" || !session.id) {
    redirect("/forbidden");
  }
  return markNotificationReadBase(id);
}
