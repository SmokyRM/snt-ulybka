import "server-only";

import { redirect } from "next/navigation";

import { listResidentNotifications, markNotificationRead as markNotificationReadBase } from "../appeals.store";
import { listCommunicationLogsForUser } from "../office/communications.store";
import { getEffectiveSessionUser } from "../session.server";
import type { ResidentNotification } from "../office/types";

export const buildResidentNotifications = (residentId: string): ResidentNotification[] => {
  const legacy = listResidentNotifications(residentId);
  const commLogs = listCommunicationLogsForUser(residentId).map((log) => ({
    id: log.id,
    appealId: "",
    plotId: log.plotId ?? undefined,
    residentId,
    title: "Сообщение",
    body: log.renderedText,
    createdAt: log.sentAt ?? new Date().toISOString(),
    readAt: log.sentAt ?? undefined,
  }));

  return [...legacy, ...commLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export async function listMyNotifications() {
  const session = await getEffectiveSessionUser();
  if (!session || session.role !== "resident" || !session.id) {
    redirect("/forbidden");
  }
  return buildResidentNotifications(session.id);
}

export async function markNotificationRead(id: string) {
  const session = await getEffectiveSessionUser();
  if (!session || session.role !== "resident" || !session.id) {
    redirect("/forbidden");
  }
  return markNotificationReadBase(id);
}
