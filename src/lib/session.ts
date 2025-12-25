"use client";

export interface Session {
  identifier: string;
  isAdmin: boolean;
}

const SESSION_KEY = "snt_session";

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D/g, "");
const normalizeIdentifier = (value: string) =>
  value.includes("@") ? normalizeEmail(value) : normalizePhone(value);

const getAdminIdentifiers = (): string[] => {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS ??
    process.env.ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_ADMIN_PHONES ??
    process.env.ADMIN_PHONES ??
    "";
  return raw
    .split(",")
    .map((item) => normalizeIdentifier(item))
    .filter(Boolean);
};

const isAdminIdentifier = (identifier: string) =>
  getAdminIdentifiers().includes(normalizeIdentifier(identifier));

export const loadSession = (): Session | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch (error) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const saveSession = (identifier: string) => {
  if (typeof window === "undefined") return;
  const session: Session = {
    identifier,
    isAdmin: isAdminIdentifier(identifier),
  };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
};
