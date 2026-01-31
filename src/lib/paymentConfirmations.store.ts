/**
 * PaymentConfirmation store
 * Sprint 21: Manages resident payment confirmations with receipt uploads
 */

import { createId } from "@/lib/mockDb";

export type PaymentConfirmationStatus = "submitted" | "in_review" | "approved" | "rejected";
export type PaymentMethod = "cash" | "card" | "bank" | "other";

export interface PaymentConfirmationAttachment {
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface PaymentConfirmation {
  id: string;
  userId: string;
  plotId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  comment: string | null;
  attachment: PaymentConfirmationAttachment | null;
  status: PaymentConfirmationStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
  linkedPaymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentConfirmationInput {
  userId: string;
  plotId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  comment?: string | null;
  attachment?: PaymentConfirmationAttachment | null;
}

interface PaymentConfirmationsDb {
  confirmations: PaymentConfirmation[];
}

const getPaymentConfirmationsDb = (): PaymentConfirmationsDb => {
  const g = globalThis as typeof globalThis & { __SNT_PAYMENT_CONFIRMATIONS_DB__?: PaymentConfirmationsDb };
  if (!g.__SNT_PAYMENT_CONFIRMATIONS_DB__) {
    g.__SNT_PAYMENT_CONFIRMATIONS_DB__ = {
      confirmations: [],
    };
  }
  return g.__SNT_PAYMENT_CONFIRMATIONS_DB__;
};

export function createPaymentConfirmation(input: PaymentConfirmationInput): PaymentConfirmation {
  const db = getPaymentConfirmationsDb();
  const now = new Date().toISOString();

  const confirmation: PaymentConfirmation = {
    id: createId("pconf"),
    userId: input.userId,
    plotId: input.plotId,
    amount: input.amount,
    paidAt: input.paidAt,
    method: input.method,
    comment: input.comment ?? null,
    attachment: input.attachment ?? null,
    status: "submitted",
    reviewedBy: null,
    reviewedAt: null,
    rejectReason: null,
    linkedPaymentId: null,
    createdAt: now,
    updatedAt: now,
  };

  db.confirmations.push(confirmation);
  return confirmation;
}

export function getPaymentConfirmation(id: string): PaymentConfirmation | null {
  const db = getPaymentConfirmationsDb();
  return db.confirmations.find((c) => c.id === id) ?? null;
}

export function listPaymentConfirmations(filters?: {
  userId?: string | null;
  plotId?: string | null;
  status?: PaymentConfirmationStatus | null;
  q?: string | null;
}): PaymentConfirmation[] {
  const db = getPaymentConfirmationsDb();
  let result = [...db.confirmations];

  if (filters?.userId) {
    result = result.filter((c) => c.userId === filters.userId);
  }
  if (filters?.plotId) {
    result = result.filter((c) => c.plotId === filters.plotId);
  }
  if (filters?.status) {
    result = result.filter((c) => c.status === filters.status);
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    result = result.filter(
      (c) =>
        c.plotId.toLowerCase().includes(q) ||
        (c.comment && c.comment.toLowerCase().includes(q))
    );
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updatePaymentConfirmation(
  id: string,
  updates: Partial<Omit<PaymentConfirmation, "id" | "createdAt">>
): PaymentConfirmation | null {
  const db = getPaymentConfirmationsDb();
  const index = db.confirmations.findIndex((c) => c.id === id);
  if (index === -1) return null;

  db.confirmations[index] = {
    ...db.confirmations[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return db.confirmations[index];
}

export function approveConfirmationWithLink(
  id: string,
  reviewedBy: string,
  linkedPaymentId: string
): PaymentConfirmation | null {
  return updatePaymentConfirmation(id, {
    status: "approved",
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    linkedPaymentId,
  });
}

export function approveConfirmationWithCreate(
  id: string,
  reviewedBy: string,
  linkedPaymentId: string
): PaymentConfirmation | null {
  return updatePaymentConfirmation(id, {
    status: "approved",
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    linkedPaymentId,
  });
}

export function rejectConfirmation(
  id: string,
  reviewedBy: string,
  reason: string
): PaymentConfirmation | null {
  return updatePaymentConfirmation(id, {
    status: "rejected",
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    rejectReason: reason,
  });
}

export function markConfirmationInReview(id: string): PaymentConfirmation | null {
  return updatePaymentConfirmation(id, { status: "in_review" });
}

export function deletePaymentConfirmation(id: string): boolean {
  const db = getPaymentConfirmationsDb();
  const index = db.confirmations.findIndex((c) => c.id === id);
  if (index === -1) return false;
  db.confirmations.splice(index, 1);
  return true;
}

export function getPaymentConfirmationsSummary(filters?: { userId?: string }): {
  total: number;
  submitted: number;
  inReview: number;
  approved: number;
  rejected: number;
} {
  const db = getPaymentConfirmationsDb();
  let confirmations = db.confirmations;

  if (filters?.userId) {
    confirmations = confirmations.filter((c) => c.userId === filters.userId);
  }

  return {
    total: confirmations.length,
    submitted: confirmations.filter((c) => c.status === "submitted").length,
    inReview: confirmations.filter((c) => c.status === "in_review").length,
    approved: confirmations.filter((c) => c.status === "approved").length,
    rejected: confirmations.filter((c) => c.status === "rejected").length,
  };
}

// Check if user can access a confirmation (owner or staff/admin)
export function canAccessConfirmation(
  confirmation: PaymentConfirmation,
  userId: string,
  isStaff: boolean
): boolean {
  if (isStaff) return true;
  return confirmation.userId === userId;
}
