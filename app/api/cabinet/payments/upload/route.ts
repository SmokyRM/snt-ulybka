/**
 * Cabinet Payment Receipt Upload API
 * Sprint 21: Upload receipt images for payment confirmations
 */
import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const toBase64 = (buffer: ArrayBuffer) =>
  Buffer.from(buffer).toString("base64");

export async function POST(request: Request) {
  const user = await getEffectiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "resident") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Допустимы только изображения JPEG/PNG/WebP или PDF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Размер файла не должен превышать 10 МБ" },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const base64 = toBase64(buffer);

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : file.type === "application/pdf"
      ? "pdf"
      : "jpg";

  // Temporary data URL. Permanent CDN storage to be added later.
  const url = `data:${file.type};base64,${base64}`;
  const filename = file.name || `receipt.${ext}`;

  return NextResponse.json({
    url,
    mime: file.type,
    size: file.size,
    filename,
  });
}
