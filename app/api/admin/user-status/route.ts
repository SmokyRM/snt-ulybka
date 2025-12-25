import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { findUserById, setUserStatus } from "@/lib/mockDb";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "board")) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const targetId = (body.userId as string | undefined)?.trim();
  const status = (body.status as string | undefined)?.trim();
  if (!targetId || !status) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }
  if (!["verified", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ error: "Недопустимый статус" }, { status: 400 });
  }

  const target = findUserById(targetId);
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const updated = setUserStatus(targetId, status as any);
  return NextResponse.json({ ok: true, user: updated });
}
