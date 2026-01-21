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
  area?: number | null; // Площадь в сотках
  // legacy/compat fields
  cadastral?: string;
  plotCode?: string;
  ownerUserId?: string | null;
}

export type UserRole =
  | "user"
  | "board"
  | "admin"
  | "accountant"
  | "operator"
  | "resident"
  | "chairman"
  | "secretary";
export type UserStatus = "pending" | "verified" | "rejected" | "pending_verification";

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
  plotNumber?: string;
  street?: string;
  role: UserRole;
  status: UserStatus;
  telegramChatId?: string | null; // Telegram chat ID для уведомлений
  pendingPersonId?: string | null; // Person ID from registry when status is pending_verification
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
  meta?: Record<string, unknown>;
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
  meta?: Record<string, unknown>;
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

export type BillingPeriodStatus = "draft" | "approved" | "closed" | "locked";

export interface UnifiedBillingPeriod {
  id: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  status: BillingPeriodStatus;
  title?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}

export interface PeriodAccrual {
  id: string;
  periodId: string;
  plotId: string;
  type: "membership" | "target" | "electric";
  amountAccrued: number;
  amountPaid: number;
  overrideApplied?: boolean | null;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FeeTariffType = "member" | "target";

export type FeeTariffMethod = "fixed" | "per_sotka" | "per_plot";

export type FeeTariffStatus = "active" | "draft";

export interface FeeTariff {
  id: string;
  type: FeeTariffType;
  method: FeeTariffMethod;
  amount: number; // фикс сумма, или за сотку, или за участок
  activeFrom: string; // YYYY-MM-DD
  activeTo?: string | null; // YYYY-MM-DD, null = бессрочно
  title?: string | null;
  status?: FeeTariffStatus | null; // active | draft, по умолчанию active
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}

export interface FeeTariffOverride {
  id: string;
  tariffId: string;
  plotId: string;
  amount: number; // индивидуальная ставка для участка
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}

export interface PaymentImport {
  id: string;
  fileName: string;
  status: "draft" | "applied" | "cancelled";
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  errorRows?: number; // строки с ошибками валидации (date/amount)
  appliedRows: number;
  createdAt: string;
  appliedAt?: string | null;
  createdByUserId?: string | null;
  appliedByUserId?: string | null;
}

export interface PaymentImportRow {
  id: string;
  importId: string;
  rowIndex: number;
  date: string; // YYYY-MM-DD
  amount: number;
  purpose?: string | null; // назначение платежа
  fullName?: string | null;
  phone?: string | null;
  plotNumber?: string | null;
  externalId?: string | null; // номер операции из банка
  matchedPlotId?: string | null;
  matchType?: "plot_number" | "phone" | "fullname" | "manual" | null;
  validationErrors?: string[] | null;
  paymentId?: string | null; // созданный платеж после применения
  rawData: Record<string, string | number | null>; // исходные данные строки
  createdAt: string;
}

export interface DebtRepaymentPlan {
  id: string;
  plotId: string;
  periodId?: string | null; // если null, то общий план погашения
  status: "pending" | "agreed" | "in_progress" | "completed" | "cancelled";
  comment?: string | null;
  agreedAmount?: number | null; // договорённая сумма к погашению
  agreedDate?: string | null; // договорённая дата погашения (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}

export interface DebtNotificationTemplate {
  id: string;
  title: string;
  body: string; // шаблон текста с плейсхолдерами: {{ownerName}}, {{plotNumber}}, {{street}}, {{debtTotal}}, {{debtMembership}}, {{debtTarget}}, {{debtElectric}}, {{periodFrom}}, {{periodTo}}
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}

export interface DebtNotificationHistory {
  id: string;
  plotId: string;
  periodId?: string | null;
  templateId?: string | null;
  generatedText: string; // сгенерированный текст уведомления
  status: "draft" | "sent_manually" | "cancelled";
  sentAt?: string | null; // дата отправки (если отправлено вручную)
  createdAt: string;
  createdByUserId?: string | null;
  sentByUserId?: string | null;
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

export interface BillingImportTotals {
  total: number;
  valid: number;
  invalid: number;
  unmatched: number;
  duplicates: number;
}

export interface BillingImport {
  id: string;
  batchId: string;
  createdAt: string;
  createdByUserId: string | null;
  fileName?: string | null;
  comment?: string | null;
  totals: BillingImportTotals;
  status: "completed" | "cancelled";
  warnings?: string[] | null;
  cancelledAt?: string | null;
}

export interface BillingImportError {
  id: string;
  billingImportId: string;
  rowIndex: number;
  type: "invalid" | "unmatched" | "duplicate";
  reason: string;
  rowText: string;
  createdAt: string;
}

export interface RegistryImport {
  id: string;
  createdAt: string;
  userId: string | null;
  fileName: string | null;
  summary: string;
  errorsCount: number;
}

export interface AiEvent {
  id: string;
  createdAt: string;
  userId: string | null;
  role: string | null;
  route: string | null;
  eventType: "assistant_opened" | "question_asked" | "answer_shown";
  meta?: Record<string, unknown> | null;
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
  createdByUserId?: string | null; // User ID who created the reading
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

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId?: string | null;
}

export interface ExpenseAttachment {
  url: string;
  filename: string;
  mime?: string | null;
  size?: number | null;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  categoryId: string; // ID категории из справочника
  description: string;
  vendor?: string | null;
  targetFundId?: string | null;
  attachment?: ExpenseAttachment | null;
  createdAt: string;
  updatedAt?: string | null;
  createdByUserId: string | null;
  updatedByUserId?: string | null;
}

export interface TargetFund {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  deadline?: string | null; // ISO date string, optional
  status: "active" | "completed" | "archived";
  createdAt: string;
  updatedAt?: string | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
  aliases?: string[];
}

// Registry types (new structure)
export interface RegistryPerson {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  plots: string[]; // Array of RegistryPlot IDs
  verificationStatus: "not_verified" | "pending" | "verified" | "rejected";
  userId?: string | null; // Linked user ID after registration
  createdAt: string;
  updatedAt: string;
}

export interface RegistryPlot {
  id: string;
  plotNumber: string; // "№" from CSV
  sntStreetNumber: string; // "Ул." from CSV - номер улицы/линии в СНТ (нормализован, например "1")
  cityAddress?: string | null; // "Адрес" from CSV - городской (домашний) адрес человека
  personId: string; // Owner RegistryPerson ID
  createdAt: string;
  updatedAt: string;
}

export interface RegistryInviteCode {
  id: string;
  personId: string;
  codeHash: string; // SHA256 hash of the code
  usedAt?: string | null;
  usedByUserId?: string | null;
  createdAt: string;
}
