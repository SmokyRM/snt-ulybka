import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { upsertUserById } from "@/lib/mockDb";
import { getRequestId } from "@/lib/api/requestId";
import { logLoginAudit } from "@/lib/loginAudit.store";

const SESSION_COOKIE = "snt_session";

const ROLE_USER_IDS: Record<string, string> = {
  admin: "user-admin-root",
  resident: "user-resident-default",
  chairman: "user-chairman-default",
  accountant: "user-accountant-default",
  secretary: "user-secretary-default",
};

const safeEquals = (a: string, b: string) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
};

const mapLogin = (
  value: string | null | undefined,
): { role: "admin" | "chairman" | "accountant" | "secretary"; env: string } | null => {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "admin" || v === "админ") return { role: "admin", env: "AUTH_PASS_ADMIN" };
  if (v === "chairman" || v === "председатель") return { role: "chairman", env: "AUTH_PASS_CHAIRMAN" };
  if (v === "accountant" || v === "бухгалтер") return { role: "accountant", env: "AUTH_PASS_ACCOUNTANT" };
  if (v === "secretary" || v === "секретарь") return { role: "secretary", env: "AUTH_PASS_SECRETARY" };
  return null;
};

const isPathAllowedForRole = (role: string, path: string | null | undefined) => {
  if (!path) return false;
  if (role === "admin") return path.startsWith("/admin");
  if (role === "chairman" || role === "accountant" || role === "secretary") {
    return (
      path.startsWith("/office") ||
      path.startsWith("/admin/billing") ||
      path.startsWith("/admin/registry")
    );
  }
  return false;
};

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  const body = await request.json().catch(() => ({}));
  const loginRaw = (body.login as string | undefined) ?? null;
  const password = (body.password as string | undefined) ?? "";
  const nextRaw = (body.next as string | undefined) ?? "";
  const sanitizedNext = sanitizeNextUrl(nextRaw);
  const mapped = mapLogin(loginRaw);
  if (!mapped || !password.trim()) {
    logLoginAudit({
      userId: null,
      role: mapped?.role ?? null,
      success: false,
      method: "password",
      ip,
      userAgent,
      requestId,
    });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const envPass = (process.env[mapped.env] ?? "").trim();
  if (!envPass) {
    return NextResponse.json(
      { error: "auth_not_configured", envVar: mapped.env, message: "Код доступа для роли " + mapped.role + " не настроен (env). Задайте " + mapped.env + " в .env.local." },
      { status: 503 },
    );
  }
  if (!safeEquals(envPass, password)) {
    logLoginAudit({
      userId: null,
      role: mapped.role,
      success: false,
      method: "password",
      ip,
      userAgent,
      requestId,
    });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const role = mapped.role;
  const userId = ROLE_USER_IDS[role];
  upsertUserById({ id: userId, role });
  
  // КРИТИЧНО: payload должен содержать роль "admin" для admin входа
  const payload = JSON.stringify({ role, userId });
  
  // Debug: проверяем что роль правильно сохраняется
  if (process.env.NODE_ENV !== "production") {
    console.log("[staff-login] Устанавливаем cookie:", {
      role,
      userId,
      payload,
      roleType: typeof role,
    });
  }
  const redirectUrl =
    sanitizedNext && isPathAllowedForRole(role, sanitizedNext)
      ? sanitizedNext
      : role === "admin"
        ? "/admin"
        : "/office";
  const response = NextResponse.json({
    ok: true,
    role,
    redirectTo: redirectUrl,
    redirectUrl, // для совместимости с клиентом
  });
  // КРИТИЧНО: Устанавливаем cookie с правильными параметрами
  // secure: только в production (не ломает localhost)
  // path: "/" чтобы cookie была доступна на всех путях
  response.cookies.set(SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  
  // Debug: в dev режиме логируем установку cookie
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    console.log("[staff-login] Cookie установлена:", {
      name: SESSION_COOKIE,
      payload,
      path: "/",
      secure: isProduction,
    });
  }
  logLoginAudit({
    userId,
    role,
    success: true,
    method: "password",
    ip,
    userAgent,
    requestId,
  });
  return response;
}
