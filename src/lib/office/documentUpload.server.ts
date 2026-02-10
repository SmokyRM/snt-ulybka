import "server-only";

import path from "path";
import fs from "fs/promises";
import { uploadDocument } from "@/lib/uploadDocument";

const sanitizeName = (name: string) =>
  name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";

const blockedNamePattern = /\.(svg|html?|xhtml)$/i;

const detectMimeByMagicBytes = (bytes: Uint8Array): string | null => {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  return null;
};

export async function uploadOfficeDocumentFile(file: File): Promise<{ fileUrl: string; fileName: string }> {
  if (blockedNamePattern.test(file.name)) {
    throw new Error("UNSUPPORTED_MIME");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectMimeByMagicBytes(bytes);
  if (!detectedMime) {
    throw new Error("UNSUPPORTED_MIME");
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const uploaded = await uploadDocument(new File([bytes], file.name, { type: detectedMime }));
    return { fileUrl: uploaded.url, fileName: uploaded.filename };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("UPLOAD_NOT_CONFIGURED");
  }

  const safeName = sanitizeName(file.name || `doc-${Date.now()}`);
  const fileName = `${Date.now()}-${safeName}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, Buffer.from(bytes));
  return { fileUrl: `/uploads/${fileName}`, fileName };
}
