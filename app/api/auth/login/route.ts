import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "snt_session";
const ADMIN_CODE = process.env.ADMIN_ACCESS_CODE || "ADMIN_CODE";
const USER_CODE = process.env.USER_ACCESS_CODE || "USER_CODE";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = (body.code as string | undefined)?.trim();

  if (!code) {
    return NextResponse.json({ error: "Не указан код" }, { status: 400 });
  }

  let role: "user" | "admin" | null = null;
  if (code === ADMIN_CODE) role = "admin";
  if (code === USER_CODE) role = "user";

  if (!role) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  const payload = JSON.stringify({ role });
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, role });
}
