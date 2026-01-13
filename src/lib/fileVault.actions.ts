"use server";

import "server-only";
import { randomUUID } from "crypto";
import { _saveFileToVault, _getMaxSize, _sanitizeFileName } from "./fileVault.server";

export async function saveFile(file: File): Promise<{ id: string; fileName: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const maxSize = _getMaxSize();
  if (arrayBuffer.byteLength > maxSize) {
    throw new Error("File too large");
  }
  const id = randomUUID();
  const fileName = _sanitizeFileName(file.name || "file");
  const mimeType = file.type || "application/octet-stream";
  _saveFileToVault(id, fileName, mimeType, Buffer.from(arrayBuffer));
  return { id, fileName, mimeType };
}
