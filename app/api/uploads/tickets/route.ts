import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const toBase64 = (buffer: ArrayBuffer) =>
  Buffer.from(buffer).toString("base64");

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      { error: "Допустимы только изображения JPEG/PNG/WebP" },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Размер файла не должен превышать 5 МБ" },
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
      : "jpg";
  // Временный data URL. Хранение/постоянный CDN будет добавлен позже (T3.2).
  const url = `data:${file.type};base64,${base64}`;

  return NextResponse.json({
    url,
    mime: file.type,
    size: file.size,
    filename: `upload.${ext}`,
  });
}

