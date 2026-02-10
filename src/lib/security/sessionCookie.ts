import { signValue, verifySignedValue } from "@/lib/security/signedValue";
import { assertSessionSecret, getSessionSecret } from "@/lib/security/env";

export type SessionPayload = {
  userId?: string;
  contact?: string;
  role?: string;
  impersonateUserId?: string;
  impersonatorAdminId?: string;
};

const encodePayload = (payload: SessionPayload) =>
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodePayload = (encoded: string): SessionPayload | null => {
  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
};

export const createSignedSessionCookieValue = (payload: SessionPayload): string => {
  const secret = assertSessionSecret();
  const encoded = encodePayload(payload);
  return signValue(encoded, secret);
};

export const parseSignedSessionCookieValue = (value: string | undefined): SessionPayload | null => {
  if (!value) return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  const verified = verifySignedValue(value, secret);
  if (!verified.ok || !verified.value) return null;
  return decodePayload(verified.value);
};

export const getSessionSecretForQa = (): string | null => getSessionSecret();
