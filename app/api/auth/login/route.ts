import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { upsertUserById } from "@/lib/mockDb";
import { logAuthEvent } from "@/lib/structuredLogger/node";
import { getRequestId } from "@/lib/api/requestId";

const SESSION_COOKIE = "snt_session";
const ADMIN_CODE = (process.env.ADMIN_ACCESS_CODE ?? "").trim();
const USER_CODE = (process.env.USER_ACCESS_CODE ?? "USER_CODE").trim();
const DEV_LOGIN_CODE = (process.env.DEV_LOGIN_CODE ?? process.env.MASTER_CODE ?? "").trim();
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
  const v = value.trim().toLowerCase();
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

const mapStaffRoleRu = (
  value: string | null | undefined
): { role: "admin" | "chairman" | "accountant" | "secretary"; env: string } | null => {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "админ" || v === "admin") return { role: "admin", env: "AUTH_PASS_ADMIN" };
  if (v === "председатель" || v === "chairman") return { role: "chairman", env: "AUTH_PASS_CHAIRMAN" };
  if (v === "бухгалтер" || v === "accountant") return { role: "accountant", env: "AUTH_PASS_ACCOUNTANT" };
  if (v === "секретарь" || v === "secretary") return { role: "secretary", env: "AUTH_PASS_SECRETARY" };
  return null;
};

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = getRequestId(request);
  const pathname = new URL(request.url).pathname;
  
  const body = await request.json().catch(() => ({}));
  const code = (body.code as string | undefined)?.trim();
  const loginRaw = (body.login as string | undefined)?.trim();
  const login = normalizeLogin(loginRaw);
  const password = (body.password as string | undefined) ?? "";
  const mode = (body.mode as string | undefined)?.trim();
  const url = new URL(request.url);
  const nextRaw = url.searchParams.get("next") || (body.next as string | undefined) || "";
  const sanitizedNext = sanitizeNextUrl(nextRaw);

  // Staff login (separate form)
  if (mode === "staff") {
    const roleRu = (body.roleRu as string | undefined)?.trim();
    const staff = mapStaffRoleRu(roleRu);
    const pass = (body.password as string | undefined) ?? "";
    if (!staff || !pass) {
      const latencyMs = Date.now() - startTime;
      logAuthEvent({
        action: "login",
        path: pathname,
        role: null,
        userId: null,
        status: 401,
        latencyMs,
        requestId,
        message: "Invalid staff login attempt",
      });
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const envPass = (process.env[staff.env] ?? "").trim();
    if (!envPass) {
      return NextResponse.json(
        { error: "auth_not_configured", envVar: staff.env, message: "Код доступа для роли " + staff.role + " не настроен (env). Задайте " + staff.env + " в .env.local." },
        { status: 503 },
      );
    }
    if (!safeEquals(envPass, pass)) {
      const latencyMs = Date.now() - startTime;
      logAuthEvent({
        action: "login",
        path: pathname,
        role: staff.role,
        userId: null,
        status: 401,
        latencyMs,
        requestId,
        message: "Invalid password for staff role",
      });
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const role = staff.role;
    const userId = ROLE_USER_IDS[role];
    upsertUserById({ id: userId, role });
    const payload = JSON.stringify({ role, userId });
    const isAdminPath = sanitizedNext?.startsWith("/admin");
    const isOfficePath = sanitizedNext?.startsWith("/office");
    const redirectUrl =
      (role === "admin" && isAdminPath ? sanitizedNext : null) ||
      ((role === "chairman" || role === "accountant" || role === "secretary") && isOfficePath ? sanitizedNext : null) ||
      (role === "admin" ? "/admin" : "/office");
    const response = NextResponse.json({ ok: true, role, redirectUrl });
    response.cookies.set(SESSION_COOKIE, payload, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    const latencyMs = Date.now() - startTime;
    logAuthEvent({
      action: "login",
      path: pathname,
      role,
      userId,
      status: 200,
      latencyMs,
      requestId,
      message: "Staff login successful",
    });
    return response;
  }

  // Credential-based login (staff roles)
  if (login || password) {
    if (!login || !password) {
      const latencyMs = Date.now() - startTime;
      logAuthEvent({
        action: "login",
        path: pathname,
        role: null,
        userId: null,
        status: 401,
        latencyMs,
        requestId,
        message: "Missing login or password",
      });
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const cred = CREDENTIALS[login];
    const envPass = cred ? (process.env[cred.env] ?? "").trim() : "";
    if (!cred) {
      const latencyMs = Date.now() - startTime;
      logAuthEvent({
        action: "login",
        path: pathname,
        role: null,
        userId: null,
        status: 400,
        latencyMs,
        requestId,
        message: "Unknown role/login",
      });
      return NextResponse.json({ error: "Неизвестная роль/логин" }, { status: 400 });
    }
    if (!envPass) {
      return NextResponse.json(
        { error: "auth_not_configured", envVar: cred.env, message: "Код доступа для роли " + cred.role + " не настроен (env). Задайте " + cred.env + " в .env.local." },
        { status: 503 },
      );
    }
    if (!safeEquals(envPass, password)) {
      const latencyMs = Date.now() - startTime;
      logAuthEvent({
        action: "login",
        path: pathname,
        role: cred.role,
        userId: null,
        status: 401,
        latencyMs,
        requestId,
        message: "Invalid password",
      });
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const role = cred.role;
    const userId = ROLE_USER_IDS[role];
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
    if (process.env.NODE_ENV !== "production") {
      response.headers.set("x-debug-role", role);
      response.headers.set("x-debug-next", sanitizedNext ?? "");
    }
    const latencyMs = Date.now() - startTime;
    logAuthEvent({
      action: "login",
      path: pathname,
      role,
      userId,
      status: 200,
      latencyMs,
      requestId,
      message: "Credential login successful",
    });
    return response;
  }

  if (!code) {
    return NextResponse.json({ error: "Не указан код" }, { status: 400 });
  }

  let role: "resident" | "admin" | "chairman" | null = null;
  const isDev = process.env.NODE_ENV !== "production";
  const qaEnabled = process.env.ENABLE_QA === "true";

  if (isDev) {
    // DEV: мастер-код DEV_LOGIN_CODE (приоритет), иначе встроенные 1111/1233/2222
    if (DEV_LOGIN_CODE && code === DEV_LOGIN_CODE) {
      role = "resident";
    } else if (code === DEV_ADMIN_CODE) role = "admin";
    else if (code === DEV_USER_CODE) role = "resident";
    else if (code === DEV_BOARD_CODE) role = "chairman";
  } else {
    // Production: при ENABLE_QA разрешаем тестовые коды (1111/1233 или TEST_ACCESS_CODE/TEST_ADMIN_CODE)
    if (qaEnabled) {
      const testResident = (process.env.TEST_ACCESS_CODE ?? "1111").trim();
      const testAdmin = (process.env.TEST_ADMIN_CODE ?? "1233").trim();
      if (code === testResident) role = "resident";
      else if (code === testAdmin) role = "admin";
    }
    if (!role && ADMIN_CODE && code === ADMIN_CODE) role = "admin";
    if (!role && code === USER_CODE) role = "resident";
  }

  if (!role) {
    const latencyMs = Date.now() - startTime;
    logAuthEvent({
      action: "login",
      path: pathname,
      role: null,
      userId: null,
      status: 401,
      latencyMs,
      requestId,
      message: "Invalid access code",
    });
    const hint =
      (isDev || qaEnabled) &&
      "Проверьте ENABLE_QA, DEV_LOGIN_CODE / MASTER_CODE, USER_ACCESS_CODE. В prod с ENABLE_QA: TEST_ACCESS_CODE, TEST_ADMIN_CODE.";
    return NextResponse.json(
      { error: "Неверный код", ...(hint && { hint }) },
      { status: 401 },
    );
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
    });
  }
  if (process.env.NODE_ENV !== "production") {
    response.headers.set("x-debug-role", role);
    response.headers.set("x-debug-next", sanitizedNext ?? "");
    response.headers.set("x-debug-admin-view-set", role === "admin" && sanitizedNext?.startsWith("/cabinet") ? "1" : "0");
  }

  const latencyMs = Date.now() - startTime;
  logAuthEvent({
    action: "login",
    path: pathname,
    role,
    userId,
    status: 200,
    latencyMs,
    requestId,
    message: "Code-based login successful",
  });

  return response;
}
