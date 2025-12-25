import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { findUserById, setUserStatus } from "@/lib/mockDb";
import { UserStatus } from "@/types/snt";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "board")) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  const targetIdRaw = (body as Record<string, unknown>).userId;
  const statusRaw = (body as Record<string, unknown>).status;
  const targetIdStr = typeof targetIdRaw === "string" ? targetIdRaw.trim() : "";
  const statusStr = typeof statusRaw === "string" ? statusRaw.trim() : "";
  if (!targetIdStr || !statusStr) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  if (!["verified", "rejected", "pending"].includes(statusStr)) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  }

  const target = findUserById(targetIdStr);
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const updated = setUserStatus(targetIdStr, statusStr as UserStatus);
  return NextResponse.json({ ok: true, user: updated });
}
