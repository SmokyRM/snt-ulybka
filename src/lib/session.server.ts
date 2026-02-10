import { cookies } from "next/headers";
import { findUserByContact, findUserById } from "@/lib/mockDb";
import { getQaScenarioFromCookies } from "@/lib/qaScenario.server";
import type { QaScenario } from "./qaScenario";
import { normalizeRole as normalizeRoleRbac } from "./rbac";
import { logStructured } from "@/lib/structuredLogger/node";
import {
  createSignedSessionCookieValue,
  parseSignedSessionCookieValue,
  type SessionPayload,
} from "@/lib/security/sessionCookie";
import { applyQaScenario } from "@/lib/security/qaOverride";

const SESSION_COOKIE = "snt_session";

export type SessionRole =
  | "user"
  | "admin"
  | "board"
  | "accountant"
  | "operator"
  | "resident"
  | "chairman"
  | "secretary";

export interface SessionUser {
  id: string;
  contact?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  plotNumber?: string;
  street?: string;
  role: SessionRole;
  status?: string;
  isImpersonating?: boolean;
  impersonatorAdminId?: string | null;
  realRole?: SessionRole;
  isQaOverride?: boolean;
  qaScenario?: QaScenario | null;
}

type SessionPayloadWithRole = SessionPayload & { role?: SessionRole };

const normalizeRole = (value: unknown): SessionRole => {
  // КРИТИЧНО: Если value null/undefined, возвращаем "user", а не "guest"
  if (value == null) return "user";
  
  const normalized = normalizeRoleRbac(String(value));
  
  // Маппим результат normalizeRoleRbac в SessionRole
  // ВАЖНО: staff роли (admin/chairman/secretary/accountant) должны сохраняться
  switch (normalized) {
    case "admin":
      return "admin";
    case "resident":
      return "resident";
    case "chairman":
      return "chairman";
    case "secretary":
      return "secretary";
    case "accountant":
      return "accountant";
    case "guest":
      // Гость без сессии
      return "user";
    default:
      // Неизвестная роль - логируем в dev и возвращаем "user"
      if (process.env.NODE_ENV !== "production") {
        logStructured("warn", {
          action: "session.normalize_role",
          value,
          normalized,
        });
      }
      return "user";
  }
};

export const getSessionPayload = async (): Promise<SessionPayloadWithRole | null> => {
  const cookieStore = await Promise.resolve(cookies());
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  return parseSignedSessionCookieValue(raw) as SessionPayloadWithRole | null;
};

const writeSessionPayload = async (payload: SessionPayloadWithRole) => {
  const signed = createSignedSessionCookieValue(payload);
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
};

const cleanPayload = (payload: SessionPayloadWithRole) => {
  const next = { ...payload } as Record<string, unknown>;
  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (value === undefined || value === null || value === "") {
      delete next[key];
    }
  });
  return next as SessionPayloadWithRole;
};

export const updateSessionPayload = async (patch: Partial<SessionPayloadWithRole>) => {
  const current = (await getSessionPayload()) ?? {};
  const next = cleanPayload({ ...current, ...patch });
  await writeSessionPayload(next);
  return next;
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const payload = await getSessionPayload();
  if (!payload || !payload.userId) return null;
  if (payload.role === "admin" && payload.impersonateUserId) {
    const impersonated = findUserById(payload.impersonateUserId);
    if (!impersonated) return null;
    return {
      id: impersonated.id,
      contact: impersonated?.email ?? impersonated?.phone,
      email: impersonated?.email,
      phone: impersonated?.phone,
      fullName: impersonated?.fullName,
      plotNumber: impersonated?.plotNumber,
      street: impersonated?.street,
      role: normalizeRole(impersonated?.role),
      status: impersonated?.status,
      isImpersonating: true,
      impersonatorAdminId: payload.impersonatorAdminId ?? payload.userId ?? null,
    };
  }
  const userRecord = payload.userId ? findUserById(payload.userId) : null;
  if (!userRecord) return null;
  
  // КРИТИЧЕСКИ ВАЖНО: Приоритет роли из сессии (payload.role) абсолютно главнее роли из БД
  // Если пользователь вошёл через staff-login с ролью admin/chairman/secretary/accountant,
  // эта роль НЕ МОЖЕТ быть перезаписана resident из участков/членства
  const roleFromPayload = payload.role;
  const roleFromDb = userRecord?.role;
  
  // Если роль есть в payload (не null и не undefined) - используем ЕЁ и ТОЛЬКО её
  // Это роль из входа через staff-login, она имеет абсолютный приоритет
  const finalRoleRaw = roleFromPayload != null ? roleFromPayload : roleFromDb;
  const role: SessionUser["role"] = normalizeRole(finalRoleRaw);
  const resolvedId = userRecord.id;
  return {
    id: resolvedId,
    contact: payload.contact ?? userRecord?.email ?? userRecord?.phone,
    email: userRecord?.email,
    phone: userRecord?.phone,
    fullName: userRecord?.fullName,
    plotNumber: userRecord?.plotNumber,
    street: userRecord?.street,
    role,
    status: userRecord?.status,
    isImpersonating: false,
    impersonatorAdminId: null,
    realRole: role,
    isQaOverride: false,
    qaScenario: null,
  };
};

export const getEffectiveSessionUser = async (): Promise<SessionUser | null> => {
  const qa = await getQaScenarioFromCookies();
  const real = await getSessionUser();
  if (!qa || !real) {
    return real;
  }
  return applyQaScenario(real, qa);
};

export const clearSessionCookie = async () => {
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
};

export const requireUser = async (): Promise<SessionUser> => {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
};

export const isAdmin = (user: SessionUser | null | undefined): boolean =>
  Boolean(user && user.role === "admin");

export const isAdminPayload = (payload: SessionPayloadWithRole | null | undefined): boolean =>
  Boolean(payload && payload.role === "admin");

export const hasAdminAccess = (user: SessionUser | null | undefined): boolean =>
  Boolean(user && ["admin", "board"].includes(user.role));

export const hasFinanceAccess = (user: SessionUser | null | undefined): boolean =>
  Boolean(user && ["admin", "accountant", "chairman", "board"].includes(user.role));

export const hasImportAccess = (user: SessionUser | null | undefined): boolean =>
  Boolean(user && ["admin", "accountant", "operator", "board"].includes(user.role));

export const hasBillingAccess = (user: SessionUser | null | undefined): boolean =>
  Boolean(user && ["admin", "accountant"].includes(user.role));
