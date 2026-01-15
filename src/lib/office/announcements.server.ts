import "server-only";

import { createOfficeAnnouncement, getOfficeAnnouncement, listOfficeAnnouncements, setOfficeAnnouncementStatus, updateOfficeAnnouncement, type OfficeAnnouncement, type OfficeAnnouncementStatus } from "./announcements.store";

export type { OfficeAnnouncementStatus, OfficeAnnouncement };

export const listAnnouncements = (params: { status?: OfficeAnnouncementStatus } = {}) =>
  listOfficeAnnouncements(params);

export const getAnnouncement = (id: string): OfficeAnnouncement | null => getOfficeAnnouncement(id);

export const createAnnouncement = (data: { title: string; body: string; authorRole?: string; status?: OfficeAnnouncementStatus }) =>
  createOfficeAnnouncement({ ...data });

export const updateAnnouncement = (
  id: string,
  data: { title?: string; body?: string; status?: OfficeAnnouncementStatus },
) => updateOfficeAnnouncement(id, data);

export const setAnnouncementPublished = (id: string, published: boolean) =>
  setOfficeAnnouncementStatus(id, published ? "published" : "draft");
