export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MembershipStatus = "UNKNOWN" | "MEMBER" | "NON_MEMBER" | "PENDING";

export interface Plot {
  id: string;
  plotId: string;
  createdAt: string;
  updatedAt: string;
  plotNumber: string;
  number: string;
  street: string;
  status?: "active" | "archived" | "DRAFT" | "INVITE_READY" | "CLAIMED" | "VERIFIED";
  needsReview?: boolean;
  ownerFullName?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus: MembershipStatus;
  isConfirmed: boolean;
  notes?: string | null;
  lastActionAt?: string | null;
  lastActionBy?: string | null;
  // legacy/compat fields
  cadastral?: string;
  plotCode?: string;
  ownerUserId?: string | null;
}

export type UserRole = "user" | "board" | "admin" | "accountant" | "operator";
export type UserStatus = "pending" | "verified" | "rejected";

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
  plotNumber?: string;
  street?: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  comment?: string | null;
  createdAt: string;
}

export interface SettingEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: string;
  updatedAt: string;
}

export interface SntSettings {
  electricityTariffRubPerKwh: number;
  electricityPaymentDeadlineDay: number;
  membershipFeeRubPerYear: number;
  targetFeeRubPerYear?: number;
  feesPaymentDeadlineDay: number;
  bankRequisitesText: string;
}

export interface ContactsSetting {
  phone?: string;
  email?: string;
  address?: string;
}

export interface ScheduleSetting {
  items: Array<{ day: string; hours: string }>;
}

export interface EntityVersion<TBefore = unknown, TAfter = unknown> {
  id: string;
  entity: string;
  entityId?: string | null;
  version: number;
  before?: TBefore | null;
  after?: TAfter | null;
  actorUserId?: string | null;
  createdAt: string;
  comment?: string | null;
}

export interface OwnershipRequest {
  id: string;
  plotNumber: string;
  street?: string;
  cadastral?: string;
  fullName: string;
  phone: string;
  email?: string;
  addressForNotices?: string;
  consentPD: boolean;
  acceptedCharter: boolean;
  status: RequestStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface PlotOwner {
  id: string;
  plotNumber: string;
  userIdentifier: string;
}

export type TicketStatus = "NEW" | "IN_PROGRESS" | "DONE";

export interface TicketAttachment {
  url: string;
  type: "image";
}

export interface Ticket {
  id: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorContact?: string | null;
  authorName?: string | null;
  authorPhone?: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  attachments?: TicketAttachment[];
}

export interface Person {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorRole: UserRole | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  comment?: string | null;
  createdAt: string;
}

export interface AccrualPeriod {
  id: string;
  year: number;
  month: number;
  type: string;
  title?: string | null;
  createdAt: string;
}

export interface AccrualItem {
  id: string;
  periodId: string;
  plotId: string;
  amountAccrued: number;
  amountPaid: number;
  note?: string | null;
  updatedAt: string;
}

export interface Payment {
  id: string;
  periodId: string;
  plotId: string;
  amount: number;
  paidAt: string;
  method: string;
  reference?: string | null;
  comment?: string | null;
  category?: string | null;
  createdByUserId: string | null;
  createdAt: string;
  isVoided: boolean;
  voidReason?: string | null;
  voidedAt?: string | null;
  voidedByUserId?: string | null;
  importBatchId?: string | null;
  fingerprint?: string | null;
  targetFundId?: string | null;
}

export interface ImportBatch {
  id: string;
  fileName?: string | null;
  importedAt: string;
  importedByUserId: string | null;
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  comment?: string | null;
  status: "completed" | "rolled_back";
  rollbackAt?: string | null;
  warnings?: Array<{ reason: string; count: number }> | null;
}

export interface ElectricityMeter {
  id: string;
  plotId: string;
  meterNumber?: string | null;
  installedAt?: string | null;
  active: boolean;
  createdAt: string;
}

export interface MeterReading {
  id: string;
  meterId: string;
  readingDate: string;
  value: number;
  source: "manual_admin" | "import" | "owner";
  createdAt: string;
}

export interface ElectricityTariff {
  id: string;
  pricePerKwh: number;
  validFrom: string;
  createdAt: string;
}

export interface DebtNotification {
  id: string;
  plotId: string;
  periodId: string;
  type: "membership" | "electricity";
  debtAmount: number;
  status: "new" | "notified" | "resolved";
  comment?: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: "roads" | "trash" | "security" | "lighting" | "electricity" | "other";
  description: string;
  vendor?: string | null;
  targetFundId?: string | null;
  createdAt: string;
  createdByUserId: string | null;
}

export interface TargetFund {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  status: "active" | "completed" | "archived";
  createdAt: string;
  aliases?: string[];
}
