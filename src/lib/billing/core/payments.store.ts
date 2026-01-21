/**
 * Payment store
 */

import { createId } from "@/lib/mockDb";
import type { Payment, PaymentSource, PaymentAllocation } from "./types";

interface PaymentsDb {
  payments: Payment[];
  allocations: PaymentAllocation[];
}

const getPaymentsDb = (): PaymentsDb => {
  const g = globalThis as typeof globalThis & { __SNT_BILLING_PAYMENTS_DB__?: PaymentsDb };
  if (!g.__SNT_BILLING_PAYMENTS_DB__) {
    g.__SNT_BILLING_PAYMENTS_DB__ = {
      payments: [],
      allocations: [],
    };
  }
  return g.__SNT_BILLING_PAYMENTS_DB__;
};

export function createPayment(data: {
  plotId: string | null;
  paidAt: string;
  amount: number;
  source: PaymentSource;
  externalId?: string | null;
  rawRowHash?: string | null;
  comment?: string | null;
}): Payment {
  const db = getPaymentsDb();
  const now = new Date().toISOString();

  const payment: Payment = {
    id: createId("payment"),
    plotId: data.plotId ?? null,
    paidAt: data.paidAt,
    amount: data.amount,
    source: data.source,
    externalId: data.externalId ?? null,
    rawRowHash: data.rawRowHash ?? null,
    comment: data.comment ?? null,
    createdAt: now,
  };
  db.payments.push(payment);
  return payment;
}

export function getPayment(id: string): Payment | null {
  const db = getPaymentsDb();
  return db.payments.find((p) => p.id === id) ?? null;
}

export function listPayments(filters?: {
  plotId?: string | null;
  source?: PaymentSource | null;
}): Payment[] {
  const db = getPaymentsDb();
  let result = [...db.payments];
  if (filters?.plotId) {
    result = result.filter((p) => p.plotId === filters.plotId);
  }
  if (filters?.source) {
    result = result.filter((p) => p.source === filters.source);
  }
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updatePayment(id: string, updates: Partial<Omit<Payment, "id" | "createdAt">>): Payment | null {
  const db = getPaymentsDb();
  const index = db.payments.findIndex((p) => p.id === id);
  if (index === -1) return null;

  db.payments[index] = {
    ...db.payments[index],
    ...updates,
  };
  return db.payments[index];
}

export function deletePayment(id: string): boolean {
  const db = getPaymentsDb();
  const index = db.payments.findIndex((p) => p.id === id);
  if (index === -1) return false;
  db.payments.splice(index, 1);
  // Also delete allocations for this payment
  db.allocations = db.allocations.filter((a) => a.paymentId !== id);
  return true;
}

// PaymentAllocation CRUD

export function createPaymentAllocation(data: {
  paymentId: string;
  accrualId: string;
  amount: number;
}): PaymentAllocation {
  const db = getPaymentsDb();
  const now = new Date().toISOString();

  const allocation: PaymentAllocation = {
    id: createId("alloc"),
    paymentId: data.paymentId,
    accrualId: data.accrualId,
    amount: data.amount,
    createdAt: now,
  };
  db.allocations.push(allocation);
  return allocation;
}

export function getPaymentAllocation(id: string): PaymentAllocation | null {
  const db = getPaymentsDb();
  return db.allocations.find((a) => a.id === id) ?? null;
}

export function listPaymentAllocations(filters?: {
  paymentId?: string | null;
  accrualId?: string | null;
}): PaymentAllocation[] {
  const db = getPaymentsDb();
  let result = [...db.allocations];
  if (filters?.paymentId) {
    result = result.filter((a) => a.paymentId === filters.paymentId);
  }
  if (filters?.accrualId) {
    result = result.filter((a) => a.accrualId === filters.accrualId);
  }
  return result;
}

export function deletePaymentAllocation(id: string): boolean {
  const db = getPaymentsDb();
  const index = db.allocations.findIndex((a) => a.id === id);
  if (index === -1) return false;
  db.allocations.splice(index, 1);
  return true;
}

export function deletePaymentAllocationsByPayment(paymentId: string): number {
  const db = getPaymentsDb();
  const initialLength = db.allocations.length;
  db.allocations = db.allocations.filter((a) => a.paymentId !== paymentId);
  return initialLength - db.allocations.length;
}