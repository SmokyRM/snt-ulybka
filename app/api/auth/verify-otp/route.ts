import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth";
import { findUserByContact, upsertUser } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const contact = (body.contact as string | undefined)?.trim();
  const code = (body.code as string | undefined)?.trim();

  if (!contact || !code) {
    return NextResponse.json({ error: "Нужно указать контакт и код." }, { status: 400 });
  }

  const valid = verifyOtp(contact, code);
  if (!valid) {
    return NextResponse.json({ error: "Неверный код" }, { status: 400 });
  }

  const adminList =
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS ||
      process.env.ADMIN_EMAILS ||
      process.env.NEXT_PUBLIC_ADMIN_PHONES ||
      process.env.ADMIN_PHONES ||
      "")
      .split(",")
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean);

  const isAdmin = adminList.includes(contact.trim().toLowerCase());

  const user =
    findUserByContact(contact) ??
    upsertUser({
      contact,
      status: isAdmin ? "verified" : "pending",
      role: isAdmin ? "admin" : "user",
    });

  if (isAdmin && user.role !== "admin") {
    upsertUser({ contact, role: "admin", status: "verified" });
  }

  const cookiePayload = JSON.stringify({
    userId: user.id,
    contact,
  });

  cookies().set(SESSION_COOKIE, cookiePayload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
