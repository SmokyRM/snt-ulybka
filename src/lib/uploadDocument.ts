import { put } from "@vercel/blob";

const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadDocument(file: File) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("MISSING_BLOB_TOKEN");
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error("UNSUPPORTED_MIME");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("FILE_TOO_LARGE");
  }
  const name = file.name || "document";
  const blob = await put(name, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return {
    url: blob.url,
    mime: file.type,
    size: file.size,
    filename: name,
  };
}
