import { headers } from "next/headers";

export async function serverFetchJson<T>(pathWithQuery: string, init?: RequestInit): Promise<T> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const normalized = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const url = `${protocol}://${host}${normalized}`;
  const res = await fetch(url, { cache: "no-store", ...init });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`serverFetchJson ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}
