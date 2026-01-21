import "server-only";

import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { logActivity } from "@/lib/activityLog.store";
import {
  listOfficeAnnouncements,
  getOfficeAnnouncement,
  createOfficeAnnouncement,
  updateOfficeAnnouncement,
  setOfficeAnnouncementStatus,
  type OfficeAnnouncement,
  type OfficeAnnouncementStatus,
} from "@/lib/office/announcements.store";

export type { OfficeAnnouncement, OfficeAnnouncementStatus };

export type ListAnnouncementsParams = {
  status?: OfficeAnnouncementStatus | "archived";
  q?: string;
};

export async function listAnnouncements(params: ListAnnouncementsParams = {}): Promise<OfficeAnnouncement[]> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "announcements.view", undefined);

  const { status, q } = params;
  let items = listOfficeAnnouncements({ q, status: status === "archived" ? undefined : status });

  // Фильтр archived (пока нет поддержки в store, возвращаем пустой массив)
  if (status === "archived") {
    items = [];
  }

  return items;
}

export async function getAnnouncement(id: string): Promise<OfficeAnnouncement | null> {
  const user = await getEffectiveSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "announcements.view", undefined);

  return getOfficeAnnouncement(id);
}

export async function createAnnouncement(params: {
  title: string;
  body: string;
  status?: OfficeAnnouncementStatus;
}): Promise<OfficeAnnouncement> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "announcements.manage", undefined);

  const announcement = createOfficeAnnouncement({
    title: params.title.trim(),
    body: params.body.trim(),
    status: params.status ?? "draft",
    authorRole: role === "admin" ? "admin" : role === "chairman" || role === "secretary" ? role : "chairman",
  });

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "announcement",
    entityId: announcement.id,
    action: "create",
    payload: {
      title: announcement.title,
      status: announcement.status,
    },
  });

  return announcement;
}

export async function updateAnnouncement(
  id: string,
  params: {
    title?: string;
    body?: string;
    status?: OfficeAnnouncementStatus;
  }
): Promise<OfficeAnnouncement> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "announcements.manage", undefined);

  const existing = getOfficeAnnouncement(id);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const updateData: {
    title?: string;
    body?: string;
    status?: OfficeAnnouncementStatus;
  } = {};
  if (params.title !== undefined) updateData.title = params.title.trim();
  if (params.body !== undefined) updateData.body = params.body.trim();
  if (params.status !== undefined) updateData.status = params.status;

  const updated = updateOfficeAnnouncement(id, updateData);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "announcement",
    entityId: id,
    action: "update",
    payload: {
      changes: Object.keys(updateData),
      oldStatus: existing.status,
      newStatus: updated.status,
    },
  });

  return updated;
}

export async function publishAnnouncement(id: string, published: boolean): Promise<OfficeAnnouncement> {
  const user = await getEffectiveSessionUser();
  if (!user || !user.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    throw new Error("FORBIDDEN");
  }
  assertCan(role, "announcements.manage", undefined);

  const existing = getOfficeAnnouncement(id);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const newStatus: OfficeAnnouncementStatus = published ? "published" : "draft";
  const updated = setOfficeAnnouncementStatus(id, newStatus);
  if (!updated) {
    throw new Error("NOT_FOUND");
  }

  // Записываем в ActivityLog
  logActivity({
    actorUserId: user.id,
    actorRole: role,
    entityType: "announcement",
    entityId: id,
    action: published ? "publish" : "unpublish",
    payload: {
      oldStatus: existing.status,
      newStatus: updated.status,
    },
  });

  return updated;
}
