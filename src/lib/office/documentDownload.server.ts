import "server-only";

import fs from "fs/promises";
import path from "path";
import { extname } from "path";
import type { OfficeDocumentRecord } from "@/lib/office/documentsRegistry.store";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const BLOCKED_MIME = new Set(["image/svg+xml", "text/html", "application/xhtml+xml"]);
const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXT));

export const sanitizeFileName = (fileName: string) => {
  const normalized = fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || "document";
};

const resolveMime = (fileName: string, fallback?: string | null) => {
  const ext = extname(fileName).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? fallback ?? "application/octet-stream";
  if (BLOCKED_MIME.has(mime) || !ALLOWED_MIME.has(mime)) {
    throw new Error("UNSUPPORTED_MIME");
  }
  return mime;
};

export async function readOfficeDocumentBytes(doc: OfficeDocumentRecord): Promise<{ body: Uint8Array; mime: string; fileName: string }> {
  const safeName = sanitizeFileName(doc.fileName);
  const mime = resolveMime(safeName, null);

  if (doc.fileUrl.startsWith("/uploads/") || doc.fileUrl.startsWith("/docs/")) {
    const publicDir = path.join(process.cwd(), "public");
    const absolutePath = path.resolve(publicDir, `.${doc.fileUrl}`);
    if (!absolutePath.startsWith(publicDir)) {
      throw new Error("INVALID_PATH");
    }
    const body = new Uint8Array(await fs.readFile(absolutePath));
    return { body, mime, fileName: safeName };
  }

  if (/^https?:\/\//i.test(doc.fileUrl)) {
    const res = await fetch(doc.fileUrl);
    if (!res.ok) {
      throw new Error("FILE_FETCH_FAILED");
    }
    const remoteContentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (remoteContentType && (BLOCKED_MIME.has(remoteContentType) || !ALLOWED_MIME.has(remoteContentType))) {
      throw new Error("UNSUPPORTED_MIME");
    }
    const body = new Uint8Array(await res.arrayBuffer());
    const finalMime = remoteContentType ? resolveMime(safeName, remoteContentType) : mime;
    return { body, mime: finalMime, fileName: safeName };
  }

  throw new Error("FILE_URL_UNSUPPORTED");
}
