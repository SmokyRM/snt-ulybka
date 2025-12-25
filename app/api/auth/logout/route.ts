import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "snt_session";

export async function POST() {
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set(SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true });
}
