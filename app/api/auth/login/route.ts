import { NextResponse } from "next/server";
import { sanitizeNext } from "@/lib/sanitizeNext";

const SESSION_COOKIE = "snt_session";
const ADMIN_CODE = (process.env.ADMIN_ACCESS_CODE ?? "").trim();
const USER_CODE = (process.env.USER_ACCESS_CODE ?? "USER_CODE").trim();
const DEV_ADMIN_CODE = "1233";
const DEV_USER_CODE = "1111";
const DEV_BOARD_CODE = "2222";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = (body.code as string | undefined)?.trim();
  const url = new URL(request.url);
  const nextRaw = url.searchParams.get("next") || (body.next as string | undefined) || "";
  const sanitizedNext = sanitizeNext(nextRaw);

  if (!code) {
    return NextResponse.json({ error: "Не указан код" }, { status: 400 });
  }

  let role: "user" | "admin" | "board" | null = null;
  const isDev = process.env.NODE_ENV !== "production";
  const host = request.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (isDev && isLocalhost) {
    // DEV ONLY: admin access allowed only via 1233 on localhost.
    if (code === DEV_ADMIN_CODE) role = "admin";
    else if (code === DEV_USER_CODE) role = "user";
    else if (code === DEV_BOARD_CODE) role = "board";
  } else {
    if (ADMIN_CODE && code === ADMIN_CODE) role = "admin";
    if (code === USER_CODE) role = "user";
  }

  if (!role) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  const payload = JSON.stringify({ role });
  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  // Set admin_view on the server to avoid race with /cabinet guard after login.
  if (role === "admin" && sanitizedNext?.startsWith("/cabinet")) {
    response.cookies.set("admin_view", "user", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: false,
    });
  }
  if (process.env.NODE_ENV !== "production") {
    response.headers.set("x-debug-role", role);
    response.headers.set("x-debug-next", sanitizedNext ?? "");
    response.headers.set("x-debug-admin-view-set", role === "admin" && sanitizedNext?.startsWith("/cabinet") ? "1" : "0");
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth] login success role=${role}`);
  }

  return response;
}
