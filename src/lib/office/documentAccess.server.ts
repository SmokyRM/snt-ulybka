import "server-only";

import { hasPermission, type Role } from "@/lib/permissions";
import { normalizeRole } from "@/lib/rbac";
import type { SessionUser } from "@/lib/session.server";
import { listOfficeDocuments, type OfficeDocumentRecord } from "@/lib/office/documentsRegistry.store";
import { getOwnedPlotIds } from "@/lib/security/ownership";

export class DocumentAccessNotFoundError extends Error {
  constructor() {
    super("Not found");
    this.name = "DocumentAccessNotFoundError";
  }
}

const toRole = (value: string | null | undefined): Role | null => {
  const normalized = normalizeRole(value);
  return normalized === "guest" ? null : normalized;
};

export async function canAccessOfficeDocument(
  user: SessionUser | null,
  doc: OfficeDocumentRecord,
): Promise<boolean> {
  if (!user) return false;
  const role = toRole(user.role);
  if (!role) return false;

  if (role === "admin" || hasPermission(role, "office.access")) {
    return true;
  }

  if (doc.isPublic || doc.accessScope === "public") {
    return true;
  }

  const ownedPlotIds = await getOwnedPlotIds(user.id);
  if (doc.plotId && ownedPlotIds.includes(doc.plotId)) {
    return true;
  }

  if (doc.personId && doc.personId === user.id) {
    return true;
  }

  return false;
}

export async function assertCanAccessOfficeDocument(
  user: SessionUser | null,
  doc: OfficeDocumentRecord | null,
): Promise<OfficeDocumentRecord> {
  if (!doc) {
    throw new DocumentAccessNotFoundError();
  }
  const allowed = await canAccessOfficeDocument(user, doc);
  if (!allowed) {
    throw new DocumentAccessNotFoundError();
  }
  return doc;
}

export async function listResidentDocuments(userId: string): Promise<OfficeDocumentRecord[]> {
  const ownedPlotIds = await getOwnedPlotIds(userId);
  const items = listOfficeDocuments();
  return items.filter((doc) => {
    if (doc.isPublic || doc.accessScope === "public") return true;
    if (doc.personId && doc.personId === userId) return true;
    if (doc.plotId && ownedPlotIds.includes(doc.plotId)) return true;
    return false;
  });
}
