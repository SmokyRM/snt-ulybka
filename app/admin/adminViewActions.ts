"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

const COOKIE_NAME = "admin_view";
const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  maxAge: 30 * 24 * 60 * 60,
};

export async function viewAsAdmin() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const store = await Promise.resolve(cookies());
  store.set(COOKIE_NAME, "admin", COOKIE_OPTIONS);
  redirect("/admin");
}

export async function viewAsUser() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const store = await Promise.resolve(cookies());
  store.set(COOKIE_NAME, "user", COOKIE_OPTIONS);
  redirect("/cabinet");
}
