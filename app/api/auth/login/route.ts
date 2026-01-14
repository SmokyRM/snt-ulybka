import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sanitizeNext } from "@/lib/sanitizeNext";
import { upsertUserById } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";
const ADMIN_CODE = (process.env.ADMIN_ACCESS_CODE ?? "").trim();
const USER_CODE = (process.env.USER_ACCESS_CODE ?? "USER_CODE").trim();
const DEV_ADMIN_CODE = "1233";
const DEV_USER_CODE = "1111";
const DEV_BOARD_CODE = "2222";

const ROLE_USER_IDS: Record<string, string> = {
  admin: "user-admin-root",
  resident: "user-resident-default",
  chairman: "user-chairman-default",
  accountant: "user-accountant-default",
  secretary: "user-secretary-default",
};

const CREDENTIALS: Record<
  string,
  { env: string; role: "admin" | "resident" | "chairman" | "accountant" | "secretary" }
> = {
  admin: { env: "AUTH_PASS_ADMIN", role: "admin" },
  resident: { env: "AUTH_PASS_RESIDENT", role: "resident" },
  chairman: { env: "AUTH_PASS_CHAIRMAN", role: "chairman" },
  accountant: { env: "AUTH_PASS_ACCOUNTANT", role: "accountant" },
  secretary: { env: "AUTH_PASS_SECRETARY", role: "secretary" },
};

const normalizeLogin = (
  value: string | null | undefined
): "admin" | "resident" | "chairman" | "accountant" | "secretary" | null => {
  if (!value) return null;
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (v === "admin" || v === "админ") return "admin";
  if (v === "resident" || v === "житель") return "resident";
  if (v === "chairman" || v === "председатель" || v === "пред") return "chairman";
  if (v === "accountant" || v === "бухгалтер" || v === "бух") return "accountant";
  if (v === "secretary" || v === "секретарь" || v === "сек") return "secretary";
  return null;
};

const safeEquals = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = (body.code as string | undefined)?.trim();
  const loginRaw = (body.login as string | undefined)?.trim();
  const login = normalizeLogin(loginRaw);
  const password = (body.password as string | undefined) ?? "";
  const url = new URL(request.url);
  const nextRaw = url.searchParams.get("next") || (body.next as string | undefined) || "";
  const sanitizedNext = sanitizeNext(nextRaw);

  // Credential-based login (staff roles)
  if (login || password) {
    if (!login || !password) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const cred = CREDENTIALS[login];
    const envPass = cred ? (process.env[cred.env] ?? "").trim() : "";
    if (!cred) {
      return NextResponse.json({ error: "Неизвестная роль/логин" }, { status: 400 });
    }
    if (!envPass || !safeEquals(envPass, password)) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const role = cred.role;
    const userId = ROLE_USER_IDS[role];
    upsertUserById({ id: userId, role });
    const payload = JSON.stringify({ role, userId });
    const { getSafeRedirectUrl } = await import("@/lib/safeRedirect");
    const redirectUrl = getSafeRedirectUrl(role, sanitizedNext);
    const response = NextResponse.json({
      ok: true,
      role,
      redirectUrl,
    });
    response.cookies.set(SESSION_COOKIE, payload, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    if (process.env.NODE_ENV !== "production") {
      response.headers.set("x-debug-role", role);
      response.headers.set("x-debug-next", sanitizedNext ?? "");
    }
    return response;
  }

  if (!code) {
    return NextResponse.json({ error: "Не указан код" }, { status: 400 });
  }

  let role: "resident" | "admin" | "chairman" | null = null;
  const isDev = process.env.NODE_ENV !== "production";
  const host = request.headers.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (isDev && isLocalhost) {
    // DEV ONLY: admin access allowed only via 1233 on localhost.
    if (code === DEV_ADMIN_CODE) role = "admin";
    else if (code === DEV_USER_CODE) role = "resident";
    else if (code === DEV_BOARD_CODE) role = "chairman";
  } else {
    if (ADMIN_CODE && code === ADMIN_CODE) role = "admin";
    if (code === USER_CODE) role = "resident";
  }

  if (!role) {
    return NextResponse.json({ error: "Неверный код" }, { status: 401 });
  }

  const userId =
    role === "admin"
      ? ROLE_USER_IDS.admin
      : role === "chairman"
        ? ROLE_USER_IDS.chairman
        : ROLE_USER_IDS.resident;
  upsertUserById({ id: userId, role });
  const payload = JSON.stringify({ role, userId });
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
      secure: process.env.NODE_ENV === "production",
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
