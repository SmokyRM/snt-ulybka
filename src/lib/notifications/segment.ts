import "server-only";

import { listDebtorSegments } from "@/lib/office/debtors";
import { findUserById } from "@/lib/mockDb";
import { maskContact } from "./templateEngine";
import type { CampaignSegment } from "./campaigns.pg";

export interface SegmentRecipient {
  userId: string;
  personId: string | null;
  plotId: string;
  plotLabel: string;
  fullName: string;
  contact: string;
  contactMasked: string;
  debtAmount: number;
}

/**
 * Build list of debtor recipients matching segment filters.
 * Uses in-memory debtor store (same as existing notification system).
 */
export function buildDebtorsSegment(segment: CampaignSegment): SegmentRecipient[] {
  const debts = listDebtorSegments();
  let rows = debts.filter((d) => d.totalDebt > 0);

  if (typeof segment.minDebt === "number" && segment.minDebt > 0) {
    rows = rows.filter((d) => d.totalDebt >= segment.minDebt!);
  }

  if (segment.street) {
    const streetLower = segment.street.toLowerCase();
    rows = rows.filter((d) => d.plotLabel.toLowerCase().includes(streetLower));
  }

  return rows.map((row) => {
    const user = findUserById(row.residentId);
    const contact = user?.phone ?? user?.email ?? "";
    return {
      userId: row.residentId,
      personId: null,
      plotId: row.plotId,
      plotLabel: row.plotLabel,
      fullName: row.residentName,
      contact,
      contactMasked: contact ? maskContact(contact) : "нет контакта",
      debtAmount: row.totalDebt,
    };
  });
}
