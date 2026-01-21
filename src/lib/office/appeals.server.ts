import "server-only";

import { type Appeal, type AppealStatus, type AppealMessage, type OutboxItem } from "./types";
import {
  getAppeal as getBaseAppeal,
  listAppeals as listBaseAppeals,
  updateAppealStatus as updateBaseAppealStatus,
  setAppealAssignee as setBaseAppealAssignee,
  setAppealDue as setBaseAppealDue,
  listAppealMessages as listBaseAppealMessages,
  sendAppealReplyToResident as sendBaseAppealReplyToResident,
  listOutbox as listBaseOutbox,
  processOutbox as processBaseOutbox,
  markOutboxRetry as markBaseOutboxRetry,
} from "../appeals.store";

export type ListAppealsParams = { status?: AppealStatus; q?: string };

export type { AppealStatus };

export const listAppeals = (params: ListAppealsParams = {}): Appeal[] =>
  listBaseAppeals(params).map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    title: item.title,
    body: item.body,
    status: item.status,
    plotNumber: item.plotNumber,
    authorId: item.authorId,
    authorName: item.authorName,
    authorPhone: item.authorPhone,
    comments: item.comments,
    assigneeRole: item.assigneeRole,
    assigneeUserId: item.assigneeUserId,
    assignedToUserId: item.assignedToUserId ?? item.assigneeUserId ?? null, // Sprint 2.1
    assignedAt: item.assignedAt ?? null,
    dueAt: item.dueAt,
    priority: item.priority,
    history: item.history,
  }));

export const getAppeal = (id: string): Appeal | null => {
  const found = getBaseAppeal(id);
  if (!found) return null;
  // Миграция Sprint 2.1: синхронизация assigneeUserId -> assignedToUserId
  const assignedToUserId = found.assignedToUserId ?? found.assigneeUserId ?? null;
  const assignedAt = found.assignedAt ?? null;
  
  return {
    id: found.id,
    createdAt: found.createdAt,
    updatedAt: found.updatedAt,
    title: found.title,
    body: found.body,
    status: found.status,
    plotNumber: found.plotNumber,
    authorId: found.authorId,
    authorName: found.authorName,
    authorPhone: found.authorPhone,
  comments: found.comments,
  assigneeRole: found.assigneeRole,
  assigneeUserId: found.assigneeUserId,
  assignedToUserId, // Sprint 2.1
  assignedAt,
  dueAt: found.dueAt,
  priority: found.priority,
  history: found.history,
  replyDraft: found.replyDraft,
  };
};

export const updateAppealStatus = (
  id: string,
  status: AppealStatus,
  updatedByRole?: "chairman" | "secretary" | "accountant" | "admin",
) => updateBaseAppealStatus(id, status, updatedByRole);

export const setAppealAssignee = (
  id: string,
  assigneeRole?: "chairman" | "secretary" | "accountant" | "admin",
  assigneeUserId?: string,
) => setBaseAppealAssignee(id, assigneeRole, assigneeUserId);

export const setAppealDue = (id: string, dueAt: string | null) => setBaseAppealDue(id, dueAt);

export const saveAppealReplyDraft = (
  id: string,
  draft: { text: string; category: string; tone: string },
  role?: "chairman" | "secretary" | "accountant" | "admin",
) => {
  const appeal = getBaseAppeal(id);
  if (!appeal) return null;
  const updated = {
    ...appeal,
    updatedAt: new Date().toISOString(),
    replyDraft: {
      text: draft.text,
      category: draft.category,
      tone: draft.tone,
      updatedAt: new Date().toISOString(),
    },
  };
  // mutate seed store
  updateBaseAppealStatus(id, appeal.status, role);
  const stored = getBaseAppeal(id);
  if (stored) {
    stored.replyDraft = updated.replyDraft;
    stored.updatedAt = updated.updatedAt;
  }
  return updated;
};

export const listAppealMessages = (appealId: string): AppealMessage[] => listBaseAppealMessages(appealId);

export const sendAppealReplyToResident = (
  appealId: string,
  params: { text: string; channelPlanned: "site" | "email" | "telegram" },
  role: "chairman" | "secretary" | "accountant" | "admin",
) => sendBaseAppealReplyToResident(appealId, params, role) as { message: AppealMessage; outboxItem?: OutboxItem } | null;

export const listOutbox = (status?: OutboxItem["status"]) => listBaseOutbox(status);

export const processOutbox = async (params?: { limit?: number }) => processBaseOutbox(params);

export const markOutboxRetry = (id: string) => markBaseOutboxRetry(id);
