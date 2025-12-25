import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const ADMIN_FEATURE_COOKIE = "admin_feature_new_ui";

const resolveCookies = async (cookieStore?: ReadonlyRequestCookies | null) => {
  if (cookieStore) return cookieStore;
  try {
    return await Promise.resolve(cookies());
  } catch {
    return null;
  }
};

export const isAdminFeatureEnabled = async (
  cookieStore?: ReadonlyRequestCookies | null
): Promise<boolean> => {
  if (process.env.ADMIN_FEATURE_NEW_UI !== "1" && process.env.ADMIN_FEATURE_NEW_UI !== "true") {
    return false;
  }
  const store = await resolveCookies(cookieStore);
  const cookieVal = store?.get?.(ADMIN_FEATURE_COOKIE)?.value;
  return cookieVal === "1";
};

export const isAdminNewUIEnabled = async (
  cookieStore?: ReadonlyRequestCookies | null
): Promise<boolean> => isAdminFeatureEnabled(cookieStore);
