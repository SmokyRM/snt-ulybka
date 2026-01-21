/**
 * Billing Core - Types
 */

export type PeriodStatus = "open" | "closed";

export interface BillingPeriod {
  id: string;
  year: number;
  month: number; // 1-12
  status: PeriodStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ContributionTariff {
  id: string;
  name: string;
  code: string; // Unique identifier
  amount: number;
  unit: "plot" | "area"; // Per plot or per area unit
  recurrence: "monthly" | "quarterly" | "yearly" | "one-time";
  active: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export type AccrualStatus = "pending" | "paid" | "partial";

export interface Accrual {
  id: string;
  periodId: string;
  plotId: string;
  tariffId: string;
  amount: number;
  status: AccrualStatus;
  createdAt: string; // ISO date string
}

export type PaymentSource = "import" | "manual";

export interface Payment {
  id: string;
  plotId: string | null;
  paidAt: string; // ISO date string
  amount: number;
  source: PaymentSource;
  externalId: string | null;
  rawRowHash: string | null;
  comment: string | null;
  createdAt: string; // ISO date string
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  accrualId: string;
  amount: number;
  createdAt: string; // ISO date string
}

export interface PaymentImportLog {
  id: string;
  fileName: string;
  status: "processing" | "completed" | "failed";
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdAt: string; // ISO date string
  completedAt: string | null;
  error: string | null;
  createdByUserId: string | null;
}

export interface PaymentImportError {
  id: string;
  importLogId: string;
  rowIndex: number;
  type: "invalid" | "unmatched" | "duplicate" | "validation";
  reason: string;
  rowData: Record<string, string | number | null>;
  createdAt: string; // ISO date string
}