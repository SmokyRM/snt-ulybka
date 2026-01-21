import { createHash } from "crypto";
import type { RegistryInviteCode } from "@/types/snt";

// In-memory store for registry invite codes
declare global {
  // eslint-disable-next-line no-var
  var __SNT_REGISTRY_INVITE_CODES_DB__: RegistryInviteCode[] | undefined;
}

function getDb(): RegistryInviteCode[] {
  if (!globalThis.__SNT_REGISTRY_INVITE_CODES_DB__) {
    globalThis.__SNT_REGISTRY_INVITE_CODES_DB__ = [];
  }
  return globalThis.__SNT_REGISTRY_INVITE_CODES_DB__;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.toUpperCase().trim()).digest("hex");
}

function generateCode(): string {
  // Generate a readable 8-character code in format XXXX-XXXX
  const part1 = Math.random().toString(36).slice(2, 6).toUpperCase();
  const part2 = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${part1}-${part2}`;
}

export function createInviteCode(personId: string): { code: string; inviteCode: RegistryInviteCode } {
  const code = generateCode();
  const codeHash = hashCode(code);
  const now = new Date().toISOString();

  // Check if there's already an unused code for this person
  const existing = getDb().find(
    (ic) => ic.personId === personId && !ic.usedAt
  );
  if (existing) {
    // Regenerate code for existing invite
    const newCode = generateCode();
    const newHash = hashCode(newCode);
    existing.codeHash = newHash;
    existing.createdAt = now;
    return { code: newCode, inviteCode: existing };
  }

  const inviteCode: RegistryInviteCode = {
    id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    personId,
    codeHash,
    usedAt: null,
    usedByUserId: null,
    createdAt: now,
  };
  getDb().push(inviteCode);
  return { code, inviteCode };
}

export function findInviteCodeByHash(codeHash: string): RegistryInviteCode | null {
  return getDb().find((ic) => ic.codeHash === codeHash) || null;
}

export function validateInviteCode(code: string): {
  valid: boolean;
  inviteCode: RegistryInviteCode | null;
  reason?: "not_found" | "already_used";
} {
  const codeHash = hashCode(code);
  const inviteCode = findInviteCodeByHash(codeHash);

  if (!inviteCode) {
    return { valid: false, inviteCode: null, reason: "not_found" };
  }

  if (inviteCode.usedAt) {
    return { valid: false, inviteCode, reason: "already_used" };
  }

  return { valid: true, inviteCode };
}

export function markInviteCodeAsUsed(code: string, userId: string): boolean {
  const codeHash = hashCode(code);
  const inviteCode = findInviteCodeByHash(codeHash);
  if (!inviteCode || inviteCode.usedAt) return false;

  inviteCode.usedAt = new Date().toISOString();
  inviteCode.usedByUserId = userId;
  return true;
}

export function listInviteCodes(params?: {
  personId?: string;
  used?: boolean;
}): RegistryInviteCode[] {
  let result = [...getDb()];

  if (params?.personId) {
    result = result.filter((ic) => ic.personId === params.personId);
  }

  if (params?.used !== undefined) {
    if (params.used) {
      result = result.filter((ic) => ic.usedAt !== null);
    } else {
      result = result.filter((ic) => ic.usedAt === null);
    }
  }

  return result;
}

export function revokeInviteCode(codeId: string): boolean {
  const db = getDb();
  const inviteCode = db.find((ic) => ic.id === codeId);
  if (!inviteCode) return false;
  
  // Mark as revoked by setting usedAt to a special value or removing
  // For simplicity, we'll remove it from the database
  const index = db.findIndex((ic) => ic.id === codeId);
  if (index !== -1) {
    db.splice(index, 1);
    return true;
  }
  return false;
}

export function markInviteCodeUsed(codeId: string, userId: string): boolean {
  const db = getDb();
  const inviteCode = db.find((ic) => ic.id === codeId);
  if (!inviteCode || inviteCode.usedAt) return false;
  
  inviteCode.usedAt = new Date().toISOString();
  inviteCode.usedByUserId = userId;
  return true;
}

export function getInviteCodeByPersonId(personId: string): RegistryInviteCode | null {
  const db = getDb();
  // Get the most recent unused code for this person
  const codes = db
    .filter((ic) => ic.personId === personId && !ic.usedAt)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return codes[0] || null;
}

export function regenerateInviteCodeForPerson(personId: string): { code: string; inviteCode: RegistryInviteCode } {
  // Revoke all existing unused codes for this person
  const db = getDb();
  const existingCodes = db.filter((ic) => ic.personId === personId && !ic.usedAt);
  existingCodes.forEach((ic) => {
    const index = db.findIndex((item) => item.id === ic.id);
    if (index !== -1) {
      db.splice(index, 1);
    }
  });
  
  // Create a new code
  return createInviteCode(personId);
}

export function getInviteCodeStatus(inviteCode: RegistryInviteCode): "active" | "used" | "revoked" | "expired" {
  if (inviteCode.usedAt) {
    return "used";
  }
  // For now, we don't have expiration, but we can add it later
  // Check if code was revoked (not in DB but we track it separately)
  // For simplicity, if it's in DB and not used, it's active
  return "active";
}
