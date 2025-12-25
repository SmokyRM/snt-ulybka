import { cookies } from "next/headers";
import { findUserByContact, findUserById } from "@/lib/mockDb";
import { User } from "@/types/snt";

const SESSION_COOKIE = "snt_session";

interface SessionPayload {
  userId: string;
  contact: string;
}

const parseCookie = (value: string | undefined): SessionPayload | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as SessionPayload;
  } catch (error) {
    return null;
  }
};

export const getSessionUser = (): User | null => {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const payload = parseCookie(raw);
  if (!payload) return null;
  return findUserById(payload.userId) ?? findUserByContact(payload.contact) ?? null;
};

export const clearSessionCookie = () => {
  cookies().set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
};
