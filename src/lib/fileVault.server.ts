import "server-only";
import { randomUUID } from "crypto";

type StoredFile = {
  id: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  createdAt: string;
};

const vault = new Map<string, StoredFile>();
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const sanitizeFileName = (name: string) => name.replace(/[\r\n"']/g, "").slice(0, 255);

export function getFile(id: string): { fileName: string; mimeType: string; bytes: Buffer } | null {
  const item = vault.get(id);
  if (!item) return null;
  return { fileName: item.fileName, mimeType: item.mimeType, bytes: item.bytes };
}

// Internal function for actions to use
export function _saveFileToVault(
  id: string,
  fileName: string,
  mimeType: string,
  bytes: Buffer,
): void {
  vault.set(id, {
    id,
    fileName,
    mimeType,
    bytes,
    createdAt: new Date().toISOString(),
  });
}

export function _getMaxSize(): number {
  return MAX_SIZE;
}

export function _sanitizeFileName(name: string): string {
  return sanitizeFileName(name);
}
