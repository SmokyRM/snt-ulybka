import "server-only";

import path from "path";
import fs from "fs/promises";
import { uploadDocument } from "@/lib/uploadDocument";

const sanitizeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "document";

export async function uploadOfficeDocumentFile(file: File): Promise<{ fileUrl: string; fileName: string }> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const uploaded = await uploadDocument(file);
    return { fileUrl: uploaded.url, fileName: uploaded.filename };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("UPLOAD_NOT_CONFIGURED");
  }

  const arrayBuffer = await file.arrayBuffer();
  const safeName = sanitizeName(file.name || `doc-${Date.now()}`);
  const fileName = `${Date.now()}-${safeName}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  return { fileUrl: `/uploads/${fileName}`, fileName };
}
