"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";

const MAX_AGE = 30 * 24 * 60 * 60; // 30 дней

export async function enableBetaHome() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }
  const store = await Promise.resolve(cookies());
  store.set("beta_home", "1", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: MAX_AGE,
  });
  redirect("/");
}

export async function disableBetaHome() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }
  const store = await Promise.resolve(cookies());
  store.set("beta_home", "0", {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    maxAge: 0,
  });
  redirect("/");
}
