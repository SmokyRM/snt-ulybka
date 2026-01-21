/**
 * Billing store - in-memory storage following mockDb pattern
 */

import { createId } from "@/lib/mockDb";
import type {
  Period,
  FeeTariff,
  Accrual,
  Payment as BillingPayment,
  PaymentAllocation,
  PeriodStatus,
  FeeTariffStatus,
  AccrualStatus,
  PaymentSource,
  PaymentImportJob,
  ImportRowError,
  NotificationSendLog,
  MessageTemplate,
} from "./types";

interface BillingDb {
  periods: Period[];
  feeTariffs: FeeTariff[];
  accruals: Accrual[];
  payments: BillingPayment[];
  paymentAllocations: PaymentAllocation[];
  paymentImportJobs: PaymentImportJob[];
  importRowErrors: ImportRowError[];
  notificationSendLogs: NotificationSendLog[];
  messageTemplates: MessageTemplate[];
}

const getBillingDb = (): BillingDb => {
  const g = globalThis as typeof globalThis & { __SNT_BILLING_DB__?: BillingDb };
  if (!g.__SNT_BILLING_DB__) {
    g.__SNT_BILLING_DB__ = {
      periods: [],
      feeTariffs: [],
      accruals: [],
      payments: [],
      paymentAllocations: [],
      paymentImportJobs: [],
      importRowErrors: [],
      notificationSendLogs: [],
      messageTemplates: [],
    };
  }
  return g.__SNT_BILLING_DB__;
};

/**
 * Period CRUD
 */
export function createPeriod(data: {
  year: number;
  month: number;
  startAt: string;
  endAt: string;
  status?: PeriodStatus;
}): Period {
  const db = getBillingDb();
  const period: Period = {
    id: createId("period"),
    year: data.year,
    month: data.month,
    startAt: data.startAt,
    endAt: data.endAt,
    status: data.status ?? "open",
  };
  db.periods.push(period);
  return period;
}

export function getPeriod(id: string): Period | null {
  const db = getBillingDb();
  return db.periods.find((p) => p.id === id) ?? null;
}

export function listPeriods(filters?: {
  status?: PeriodStatus | null;
  year?: number | null;
  month?: number | null;
}): Period[] {
  const db = getBillingDb();
  let result = db.periods;
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }
  if (filters?.year !== null && filters?.year !== undefined) {
    result = result.filter((p) => p.year === filters.year);
  }
  if (filters?.month !== null && filters?.month !== undefined) {
    result = result.filter((p) => p.month === filters.month);
  }
  return result.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

export function updatePeriod(id: string, updates: Partial<Period>): Period | null {
  const db = getBillingDb();
  const index = db.periods.findIndex((p) => p.id === id);
  if (index === -1) return null;
  db.periods[index] = { ...db.periods[index], ...updates };
  return db.periods[index];
}

/**
 * FeeTariff CRUD
 */
export function createFeeTariff(data: {
  type: string;
  title: string;
  amount: number;
  appliesTo: "plot" | "area";
  activeFrom: string;
  activeTo?: string | null;
  status?: FeeTariffStatus;
}): FeeTariff {
  const db = getBillingDb();
  const tariff: FeeTariff = {
    id: createId("tariff"),
    type: data.type,
    title: data.title,
    amount: data.amount,
    appliesTo: data.appliesTo,
    activeFrom: data.activeFrom,
    activeTo: data.activeTo ?? null,
    status: data.status ?? "active",
  };
  db.feeTariffs.push(tariff);
  return tariff;
}

export function getFeeTariff(id: string): FeeTariff | null {
  const db = getBillingDb();
  return db.feeTariffs.find((t) => t.id === id) ?? null;
}

export function listFeeTariffs(filters?: {
  status?: FeeTariffStatus | null;
  type?: string | null;
  activeAt?: string | null; // ISO date string - return tariffs active at this date
}): FeeTariff[] {
  const db = getBillingDb();
  let result = db.feeTariffs;
  if (filters?.status) {
    result = result.filter((t) => t.status === filters.status);
  }
  if (filters?.type) {
    result = result.filter((t) => t.type === filters.type);
  }
  if (filters?.activeAt) {
    const activeAt = new Date(filters.activeAt).getTime();
    result = result.filter((t) => {
      const from = new Date(t.activeFrom).getTime();
      const to = t.activeTo ? new Date(t.activeTo).getTime() : Infinity;
      return activeAt >= from && activeAt <= to;
    });
  }
  return result.sort((a, b) => new Date(b.activeFrom).getTime() - new Date(a.activeFrom).getTime());
}

export function updateFeeTariff(id: string, updates: Partial<FeeTariff>): FeeTariff | null {
  const db = getBillingDb();
  const index = db.feeTariffs.findIndex((t) => t.id === id);
  if (index === -1) return null;
  db.feeTariffs[index] = { ...db.feeTariffs[index], ...updates };
  return db.feeTariffs[index];
}

/**
 * Accrual CRUD
 */
export function createAccrual(data: {
  periodId: string;
  plotId: string;
  tariffId: string;
  amount: number;
  status?: AccrualStatus;
}): Accrual {
  const db = getBillingDb();
  const accrual: Accrual = {
    id: createId("accrual"),
    periodId: data.periodId,
    plotId: data.plotId,
    tariffId: data.tariffId,
    amount: data.amount,
    status: data.status ?? "pending",
    createdAt: new Date().toISOString(),
  };
  db.accruals.push(accrual);
  return accrual;
}

export function getAccrual(id: string): Accrual | null {
  const db = getBillingDb();
  return db.accruals.find((a) => a.id === id) ?? null;
}

export function listAccruals(filters?: {
  periodId?: string | null;
  plotId?: string | null;
  status?: AccrualStatus | null;
}): Accrual[] {
  const db = getBillingDb();
  let result = db.accruals;
  if (filters?.periodId) {
    result = result.filter((a) => a.periodId === filters.periodId);
  }
  if (filters?.plotId) {
    result = result.filter((a) => a.plotId === filters.plotId);
  }
  if (filters?.status) {
    result = result.filter((a) => a.status === filters.status);
  }
  return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function updateAccrual(id: string, updates: Partial<Accrual>): Accrual | null {
  const db = getBillingDb();
  const index = db.accruals.findIndex((a) => a.id === id);
  if (index === -1) return null;
  db.accruals[index] = { ...db.accruals[index], ...updates };
  return db.accruals[index];
}

/**
 * Payment CRUD
 */
export function createPayment(data: {
  plotId?: string | null;
  paidAt: string;
  amount: number;
  source: PaymentSource;
  externalId?: string | null;
  rawRowHash?: string | null;
  comment?: string | null;
}): BillingPayment {
  const db = getBillingDb();
  const payment: BillingPayment = {
    id: createId("payment"),
    plotId: data.plotId ?? null,
    paidAt: data.paidAt,
    amount: data.amount,
    source: data.source,
    externalId: data.externalId ?? null,
    rawRowHash: data.rawRowHash ?? null,
    comment: data.comment ?? null,
  };
  db.payments.push(payment);
  return payment;
}

export function getPayment(id: string): BillingPayment | null {
  const db = getBillingDb();
  return db.payments.find((p) => p.id === id) ?? null;
}

export function listPayments(filters?: {
  plotId?: string | null;
  source?: PaymentSource | null;
}): BillingPayment[] {
  const db = getBillingDb();
  let result = db.payments;
  if (filters?.plotId) {
    result = result.filter((p) => p.plotId === filters.plotId);
  }
  if (filters?.source) {
    result = result.filter((p) => p.source === filters.source);
  }
  return result.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
}

/**
 * PaymentAllocation CRUD
 */
export function createPaymentAllocation(data: {
  paymentId: string;
  accrualId: string;
  amount: number;
}): PaymentAllocation {
  const db = getBillingDb();
  const allocation: PaymentAllocation = {
    id: createId("allocation"),
    paymentId: data.paymentId,
    accrualId: data.accrualId,
    amount: data.amount,
  };
  db.paymentAllocations.push(allocation);
  return allocation;
}

export function getPaymentAllocation(id: string): PaymentAllocation | null {
  const db = getBillingDb();
  return db.paymentAllocations.find((a) => a.id === id) ?? null;
}

export function listPaymentAllocations(filters?: {
  paymentId?: string | null;
  accrualId?: string | null;
}): PaymentAllocation[] {
  const db = getBillingDb();
  let result = db.paymentAllocations;
  if (filters?.paymentId) {
    result = result.filter((a) => a.paymentId === filters.paymentId);
  }
  if (filters?.accrualId) {
    result = result.filter((a) => a.accrualId === filters.accrualId);
  }
  return result;
}

export function deletePaymentAllocation(id: string): boolean {
  const db = getBillingDb();
  const index = db.paymentAllocations.findIndex((a) => a.id === id);
  if (index === -1) return false;
  db.paymentAllocations.splice(index, 1);
  return true;
}

/**
 * PaymentImportJob CRUD
 */
export function createPaymentImportJob(data: {
  fileName: string;
  createdByUserId: string | null;
  totalRows: number;
}): PaymentImportJob {
  const db = getBillingDb();
  const job: PaymentImportJob = {
    id: createId("import"),
    fileName: data.fileName,
    createdAt: new Date().toISOString(),
    createdByUserId: data.createdByUserId,
    status: "processing",
    totalRows: data.totalRows,
    successCount: 0,
    failedCount: 0,
    createdPaymentsCount: 0,
  };
  db.paymentImportJobs.unshift(job);
  return job;
}

export function getPaymentImportJob(id: string): PaymentImportJob | null {
  const db = getBillingDb();
  return db.paymentImportJobs.find((j) => j.id === id) ?? null;
}

export function listPaymentImportJobs(): PaymentImportJob[] {
  const db = getBillingDb();
  return db.paymentImportJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function updatePaymentImportJob(id: string, updates: Partial<PaymentImportJob>): PaymentImportJob | null {
  const db = getBillingDb();
  const index = db.paymentImportJobs.findIndex((j) => j.id === id);
  if (index === -1) return null;
  db.paymentImportJobs[index] = { ...db.paymentImportJobs[index], ...updates };
  return db.paymentImportJobs[index];
}

/**
 * ImportRowError CRUD
 */
export function createImportRowError(data: {
  importJobId: string;
  rowIndex: number;
  type: ImportRowError["type"];
  reason: string;
  rowData: Record<string, string | number | null>;
}): ImportRowError {
  const db = getBillingDb();
  const error: ImportRowError = {
    id: createId("error"),
    importJobId: data.importJobId,
    rowIndex: data.rowIndex,
    type: data.type,
    reason: data.reason,
    rowData: data.rowData,
    createdAt: new Date().toISOString(),
  };
  db.importRowErrors.push(error);
  return error;
}

export function listImportRowErrors(importJobId: string): ImportRowError[] {
  const db = getBillingDb();
  return db.importRowErrors
    .filter((e) => e.importJobId === importJobId)
    .sort((a, b) => a.rowIndex - b.rowIndex);
}

export function deleteImportRowErrors(importJobId: string): number {
  const db = getBillingDb();
  const initialLength = db.importRowErrors.length;
  db.importRowErrors = db.importRowErrors.filter((e) => e.importJobId !== importJobId);
  return initialLength - db.importRowErrors.length;
}

/**
 * MessageTemplate CRUD
 */
export function createMessageTemplate(data: {
  title: string;
  message: string;
  variables: string[];
  channel?: MessageTemplate["channel"];
  createdByUserId: string | null;
}): MessageTemplate {
  const db = getBillingDb();
  const now = new Date().toISOString();
  const template: MessageTemplate = {
    id: createId("template"),
    title: data.title,
    message: data.message,
    variables: data.variables,
    channel: data.channel ?? "sms",
    createdAt: now,
    updatedAt: now,
    createdByUserId: data.createdByUserId,
  };
  db.messageTemplates.push(template);
  return template;
}

export function getMessageTemplate(id: string): MessageTemplate | null {
  const db = getBillingDb();
  return db.messageTemplates.find((t) => t.id === id) ?? null;
}

export function listMessageTemplates(): MessageTemplate[] {
  const db = getBillingDb();
  return db.messageTemplates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function updateMessageTemplate(id: string, updates: Partial<Omit<MessageTemplate, "id" | "createdAt" | "createdByUserId">>): MessageTemplate | null {
  const db = getBillingDb();
  const index = db.messageTemplates.findIndex((t) => t.id === id);
  if (index === -1) return null;
  db.messageTemplates[index] = {
    ...db.messageTemplates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return db.messageTemplates[index];
}

export function deleteMessageTemplate(id: string): boolean {
  const db = getBillingDb();
  const index = db.messageTemplates.findIndex((t) => t.id === id);
  if (index === -1) return false;
  db.messageTemplates.splice(index, 1);
  return true;
}

/**
 * NotificationSendLog CRUD
 */
export function createNotificationSendLog(data: {
  plotId: string;
  templateId: string;
  channel: NotificationSendLog["channel"];
  status: NotificationSendLog["status"];
  message: string;
  variables: Record<string, string | number>;
  createdByUserId: string | null;
  error?: string | null;
}): NotificationSendLog {
  const db = getBillingDb();
  const log: NotificationSendLog = {
    id: createId("notif"),
    plotId: data.plotId,
    templateId: data.templateId,
    channel: data.channel,
    status: data.status,
    message: data.message,
    variables: data.variables,
    sentAt: new Date().toISOString(),
    createdByUserId: data.createdByUserId,
    error: data.error ?? null,
  };
  db.notificationSendLogs.unshift(log);
  // Keep only last 10000 logs
  if (db.notificationSendLogs.length > 10000) {
    db.notificationSendLogs = db.notificationSendLogs.slice(0, 10000);
  }
  return log;
}

export function getNotificationSendLog(id: string): NotificationSendLog | null {
  const db = getBillingDb();
  return db.notificationSendLogs.find((l) => l.id === id) ?? null;
}

export function listNotificationSendLogs(filters?: {
  plotId?: string | null;
  templateId?: string | null;
  channel?: NotificationSendLog["channel"] | null;
  status?: NotificationSendLog["status"] | null;
}): NotificationSendLog[] {
  const db = getBillingDb();
  let result = db.notificationSendLogs;
  if (filters?.plotId) {
    result = result.filter((l) => l.plotId === filters.plotId);
  }
  if (filters?.templateId) {
    result = result.filter((l) => l.templateId === filters.templateId);
  }
  if (filters?.channel) {
    result = result.filter((l) => l.channel === filters.channel);
  }
  if (filters?.status) {
    result = result.filter((l) => l.status === filters.status);
  }
  return result.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}