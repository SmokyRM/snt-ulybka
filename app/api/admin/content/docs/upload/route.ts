import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { uploadDocument } from "@/lib/uploadDocument";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
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
  try {
    const uploaded = await uploadDocument(file);
    return NextResponse.json({
      url: uploaded.url,
      filename: uploaded.filename,
      mime: uploaded.mime,
      size: uploaded.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UPLOAD_FAILED";
    const status =
      message === "UNSUPPORTED_MIME" || message === "FILE_TOO_LARGE" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
