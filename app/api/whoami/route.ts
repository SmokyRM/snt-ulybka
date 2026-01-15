import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionPayload, getSessionUser, getEffectiveSessionUser } from "@/lib/session.server";
import { normalizeRole } from "@/lib/rbac";
import { findUserById } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";

export async function GET() {
  // Читаем cookie напрямую для диагностики
  const cookieStore = await Promise.resolve(cookies());
  const rawCookie = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  
  const payload = await getSessionPayload();
  const user = await getSessionUser();
  const effectiveUser = await getEffectiveSessionUser();
  
  // Дополнительная диагностика: проверяем роль в БД
  const dbUser = payload?.userId ? findUserById(payload.userId) : null;
  
  // Парсим raw cookie для диагностики
  let parsedCookie: { role?: string; userId?: string } | null = null;
  try {
    parsedCookie = rawCookie ? JSON.parse(rawCookie) : null;
  } catch {
    parsedCookie = null;
  }
  
  const debug = {
    timestamp: new Date().toISOString(),
    rawCookie: {
      exists: rawCookie !== null,
      value: rawCookie,
      parsed: parsedCookie,
    },
    cookie: {
      userId: payload?.userId ?? null,
      role: payload?.role ?? null,
      roleType: payload?.role != null ? typeof payload.role : null,
      raw: payload ? JSON.stringify(payload) : null,
    },
    database: {
      userId: dbUser?.id ?? null,
      role: dbUser?.role ?? null,
      fullName: dbUser?.fullName ?? null,
    },
    session: {
      user: user ? {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        isImpersonating: user.isImpersonating,
        realRole: user.realRole,
      } : null,
      effectiveUser: effectiveUser ? {
        id: effectiveUser.id,
        role: effectiveUser.role,
        fullName: effectiveUser.fullName,
        isImpersonating: effectiveUser.isImpersonating,
        isQaOverride: effectiveUser.isQaOverride,
        realRole: effectiveUser.realRole,
        qaScenario: effectiveUser.qaScenario,
      } : null,
    },
    normalized: {
      rawCookieRole: parsedCookie?.role != null ? normalizeRole(parsedCookie.role) : null,
      payloadRole: payload?.role != null ? normalizeRole(payload.role) : null,
      dbRole: dbUser?.role != null ? normalizeRole(dbUser.role) : null,
      userRole: user?.role != null ? normalizeRole(user.role) : null,
      effectiveRole: effectiveUser?.role != null ? normalizeRole(effectiveUser.role) : null,
    },
    analysis: {
      authenticated: effectiveUser !== null,
      authSource: payload?.role ? "staff-login" : payload?.userId ? "login" : "none",
      rolePriority: payload?.role != null ? "cookie" : "database",
      roleMatch: payload?.role === dbUser?.role ? "match" : "mismatch",
      cookieAccessible: rawCookie !== null,
      sessionAccessible: payload !== null,
      isAdmin: effectiveUser?.role === "admin",
      canAccessAdmin: effectiveUser?.role === "admin",
    },
  };
  
  return NextResponse.json(debug, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
