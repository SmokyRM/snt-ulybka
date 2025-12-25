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
}

interface SessionPayload {
  userId?: string;
  contact?: string;
  role?: "user" | "admin" | "board";
}

const parseCookie = (value: string | undefined): SessionPayload | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionPayload;
  } catch {
    return null;
  }
};

export const getSessionUser = async (): Promise<SessionUser | null> => {
  const cookieStore = await Promise.resolve(cookies());
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = parseCookie(raw);
  if (!payload) return null;
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
