"use server";

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

export async function saveFile(file: File): Promise<{ id: string; fileName: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_SIZE) {
    throw new Error("File too large");
  }
  const id = randomUUID();
  const fileName = sanitizeFileName(file.name || "file");
  const mimeType = file.type || "application/octet-stream";
  vault.set(id, {
    id,
    fileName,
    mimeType,
    bytes: Buffer.from(arrayBuffer),
    createdAt: new Date().toISOString(),
  });
  return { id, fileName, mimeType };
}

export function getFile(id: string): { fileName: string; mimeType: string; bytes: Buffer } | null {
  const item = vault.get(id);
  if (!item) return null;
  return { fileName: item.fileName, mimeType: item.mimeType, bytes: item.bytes };
}
