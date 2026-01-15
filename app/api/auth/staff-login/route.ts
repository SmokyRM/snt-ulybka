import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { upsertUserById } from "@/lib/mockDb";

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
  if (role === "chairman" || role === "accountant" || role === "secretary") return path.startsWith("/office");
  return false;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const loginRaw = (body.login as string | undefined) ?? null;
  const password = (body.password as string | undefined) ?? "";
  const nextRaw = (body.next as string | undefined) ?? "";
  const sanitizedNext = sanitizeNextUrl(nextRaw);
  const mapped = mapLogin(loginRaw);
  if (!mapped || !password.trim()) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const envPass = (process.env[mapped.env] ?? "").trim();
  if (!envPass || !safeEquals(envPass, password)) {
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
  const response = NextResponse.json({
    ok: true,
    role,
    redirectTo:
      sanitizedNext && isPathAllowedForRole(role, sanitizedNext)
        ? sanitizedNext
        : role === "admin"
          ? "/admin"
          : "/office",
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
  return response;
}
