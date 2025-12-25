export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MembershipStatus = "UNKNOWN" | "MEMBER" | "NON_MEMBER";

export interface Plot {
  id: string;
  plotId: string;
  createdAt: string;
  updatedAt: string;
  plotNumber: string;
  number: string;
  street: string;
  ownerFullName?: string | null;
  phone?: string | null;
  email?: string | null;
  membershipStatus: MembershipStatus;
  isConfirmed: boolean;
  notes?: string | null;
  // legacy/compat fields
  cadastral?: string;
  plotCode?: string;
  ownerUserId?: string | null;
}

export type UserRole = "user" | "board" | "admin";
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
  createdAt: string;
}

export interface SettingEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: string;
  updatedAt: string;
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
