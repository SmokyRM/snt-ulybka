export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Plot {
  id: string;
  number: string;
  street?: string;
  cadastral?: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName?: string;
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
