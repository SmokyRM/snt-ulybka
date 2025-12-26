import { headers } from "next/headers";

export const getServerApiUrl = async (path: string) => {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}://${host}${normalized}`;
};
