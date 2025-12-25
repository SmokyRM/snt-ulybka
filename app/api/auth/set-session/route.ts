import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findUserByContact, findUserById } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = (body.userId as string | undefined)?.trim();
  const contact = (body.contact as string | undefined)?.trim();

  if (!userId && !contact) {
    return NextResponse.json({ error: "Нет данных пользователя" }, { status: 400 });
  }

  const user =
    (userId && findUserById(userId)) ||
    (contact && findUserByContact(contact));

  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const payload = { userId: user.id, contact: contact || user.email || user.phone };

  cookies().set(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
