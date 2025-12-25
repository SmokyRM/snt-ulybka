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

export const getSessionClient = (): SessionPayload | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.split("=", 2)[1] ?? "");
  return parseCookie(value);
};
