import { headers } from "next/headers";

export async function serverFetchJson<T>(pathWithQuery: string, init?: RequestInit): Promise<T> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const normalized = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const url = `${protocol}://${host}${normalized}`;
  // Передаем cookies для server-side fetch чтобы обеспечить авторизацию
  const cookieHeader = h.get("cookie");
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`serverFetchJson ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}
