/**
 * Billing foundation models
 */

export type PeriodStatus = "open" | "closed";

export interface Period {
  id: string;
  year: number;
  month: number;
  startAt: string; // ISO date string
  endAt: string; // ISO date string
  status: PeriodStatus;
}

export type FeeTariffStatus = "active" | "inactive";

export interface FeeTariff {
  id: string;
  type: string;
  title: string;
  amount: number;
  appliesTo: "plot" | "area";
  activeFrom: string; // ISO date string
  activeTo?: string | null; // ISO date string, null if currently active
  status: FeeTariffStatus;
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
  plotId?: string | null;
  paidAt: string; // ISO date string
  amount: number;
  source: PaymentSource;
  externalId?: string | null;
  rawRowHash?: string | null;
  comment?: string | null;
}

export interface PaymentAllocation {
  id: string;
  paymentId: string;
  accrualId: string;
  amount: number;
}

/**
 * Service result types
 */

export interface PeriodSummary {
  periodId: string;
  totalAccrued: number;
  totalPaid: number;
  totalDebt: number;
}

export interface PlotBalanceBreakdown {
  accrualId: string;
  periodId: string;
  tariffId: string;
  amount: number;
  allocated: number;
  remaining: number;
  status: AccrualStatus;
}

export interface PlotBalance {
  plotId: string;
  periodId?: string | null;
  totalAccrued: number;
  totalPaid: number;
  totalDebt: number;
  breakdown: PlotBalanceBreakdown[];
}

export interface DebtByPlotResult {
  plotId: string;
  totalDebt: number;
  periods: Array<{
    periodId: string;
    year: number;
    month: number;
    debt: number;
  }>;
}

export interface ComputeDebtByPlotFilters {
  periodId?: string | null;
  plotId?: string | null;
  minDebt?: number | null;
}

/**
 * Payment import job
 */
export interface PaymentImportJob {
  id: string;
  fileName: string;
  createdAt: string;
  createdByUserId: string | null;
  status: "processing" | "completed" | "failed";
  totalRows: number;
  successCount: number;
  failedCount: number;
  createdPaymentsCount: number;
  completedAt?: string | null;
  error?: string | null;
}

/**
 * Import row error
 */
export interface ImportRowError {
  id: string;
  importJobId: string;
  rowIndex: number;
  type: "invalid" | "unmatched" | "duplicate" | "validation";
  reason: string;
  rowData: Record<string, string | number | null>;
  createdAt: string;
}

/**
 * Notification send log
 */
export interface NotificationSendLog {
  id: string;
  plotId: string;
  templateId: string;
  channel: "sms" | "telegram" | "email" | "site";
  status: "sent" | "failed" | "simulated";
  message: string;
  variables: Record<string, string | number>;
  sentAt: string;
  createdByUserId: string | null;
  error?: string | null;
}

export type MessageTemplateChannel = "sms" | "email" | "whatsapp-draft";

/**
 * Message template (SMS / Email / WhatsApp-черновик)
 */
export interface MessageTemplate {
  id: string;
  title: string;
  message: string;
  variables: string[];
  channel?: MessageTemplateChannel | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
}