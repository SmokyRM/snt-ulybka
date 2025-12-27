import { cookies } from "next/headers";
import { findUserByContact, findUserById } from "@/lib/mockDb";

const SESSION_COOKIE = "snt_session";

export interface SessionUser {
  id?: string;
  contact?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  role: "user" | "admin" | "board";
  status?: string;
  isImpersonating?: boolean;
  impersonatorAdminId?: string | null;
}

interface SessionPayload {
  userId?: string;
  contact?: string;
  role?: "user" | "admin" | "board";
  impersonateUserId?: string;
  impersonatorAdminId?: string;
}

const parseCookie = (value: string | undefined): SessionPayload | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionPayload;
  } catch {
    return null;
  }
};

export const getSessionPayload = async (): Promise<SessionPayload | null> => {
  const cookieStore = await Promise.resolve(cookies());
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  return parseCookie(raw);
};

const writeSessionPayload = async (payload: SessionPayload) => {
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
};

const cleanPayload = (payload: SessionPayload) => {
  const next = { ...payload } as Record<string, unknown>;
  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (value === undefined || value === null || value === "") {
      delete next[key];
    }
  });
  return next as SessionPayload;
};

export const updateSessionPayload = async (patch: Partial<SessionPayload>) => {
  const current = (await getSessionPayload()) ?? {};
  const next = cleanPayload({ ...current, ...patch });
  await writeSessionPayload(next);
  return next;
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const payload = await getSessionPayload();
  if (!payload) return null;
  if (payload.role === "admin" && payload.impersonateUserId) {
    const impersonated = findUserById(payload.impersonateUserId);
    return {
      id: impersonated?.id ?? payload.impersonateUserId,
      contact: impersonated?.email ?? impersonated?.phone,
      email: impersonated?.email,
      phone: impersonated?.phone,
      fullName: impersonated?.fullName,
      role:
        impersonated?.role === "admin"
          ? "admin"
          : impersonated?.role === "board"
          ? "board"
          : "user",
      status: impersonated?.status,
      isImpersonating: true,
      impersonatorAdminId: payload.impersonatorAdminId ?? payload.userId ?? null,
    };
  }
  const userRecord =
    (payload.userId && findUserById(payload.userId)) ||
    (payload.contact && findUserByContact(payload.contact)) ||
    null;
  const roleFromPayload = payload.role;
  const role: SessionUser["role"] =
    roleFromPayload ||
    (userRecord?.role === "admin"
      ? "admin"
      : userRecord?.role === "board"
      ? "board"
      : "user");
  return {
    id: userRecord?.id ?? payload.userId,
    contact: payload.contact ?? userRecord?.email ?? userRecord?.phone,
    email: userRecord?.email,
    phone: userRecord?.phone,
    fullName: userRecord?.fullName,
    role,
    status: userRecord?.status,
    isImpersonating: false,
    impersonatorAdminId: null,
  };
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

export const isAdminPayload = (payload: SessionPayload | null | undefined): boolean =>
  Boolean(payload && payload.role === "admin");
