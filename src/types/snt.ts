export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Plot {
  plotId: string;
  plotNumber: string;
  street: string;
  cadastral?: string;
  plotCode: string;
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
