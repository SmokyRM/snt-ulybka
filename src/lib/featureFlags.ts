import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { promises as fs } from "node:fs";
import path from "node:path";

export const ADMIN_FEATURE_COOKIE = "admin_feature_new_ui";
export type FeatureFlagKey = "ADMIN_FEATURE_NEW_UI";
export type FeatureFlags = Record<FeatureFlagKey, boolean>;

const FLAG_FILE_PATH = path.join(process.cwd(), "data", "featureFlags.json");

const parseBool = (value: string | undefined | null): boolean =>
  value === "1" || value?.toLowerCase?.() === "true";

const flagCookieName = (key: FeatureFlagKey) => {
  void key;
  return ADMIN_FEATURE_COOKIE;
};

const resolveCookies = async (cookieStore?: ReadonlyRequestCookies | null) => {
  if (cookieStore) return cookieStore;
  try {
    return await Promise.resolve(cookies());
  } catch {
    return null;
  }
};

const readFileFlags = async (): Promise<Partial<FeatureFlags>> => {
  try {
    const raw = await fs.readFile(FLAG_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return parsed;
  } catch {
    return {};
  }
};

const writeFileFlag = async (key: FeatureFlagKey, value: boolean): Promise<boolean> => {
  try {
    const dir = path.dirname(FLAG_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    const existing = await readFileFlags();
    const nextFlags: Partial<FeatureFlags> = { ...existing, [key]: value };
    await fs.writeFile(FLAG_FILE_PATH, JSON.stringify(nextFlags, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
};

export const getFeatureFlags = async (
  cookieStore?: ReadonlyRequestCookies | null
): Promise<FeatureFlags> => {
  const store = await resolveCookies(cookieStore);
  const fileFlags = await readFileFlags();
  const envDefault = parseBool(process.env.ADMIN_FEATURE_NEW_UI ?? undefined);
  const cookieValRaw = store?.get?.(flagCookieName("ADMIN_FEATURE_NEW_UI"))?.value;
  const cookieVal = cookieValRaw === "0" ? false : cookieValRaw === "1" ? true : undefined;

  const newUi = cookieVal ?? fileFlags.ADMIN_FEATURE_NEW_UI ?? envDefault ?? false;

  return {
    ADMIN_FEATURE_NEW_UI: Boolean(newUi),
  };
};

export const isAdminFeatureEnabled = async (
  key: FeatureFlagKey,
  cookieStore?: ReadonlyRequestCookies | null
): Promise<boolean> => {
  const flags = await getFeatureFlags(cookieStore);
  return Boolean(flags[key]);
};

export const isAdminNewUIEnabled = async (
  cookieStore?: ReadonlyRequestCookies | null
): Promise<boolean> => isAdminFeatureEnabled("ADMIN_FEATURE_NEW_UI", cookieStore);

export const setFeatureFlag = async (
  key: FeatureFlagKey,
  value: boolean,
  cookieStore?: ReadonlyRequestCookies | null
): Promise<void> => {
  const persisted = await writeFileFlag(key, value);
  if (persisted) return;
  const store = await resolveCookies(cookieStore);
  store?.set?.(flagCookieName(key), value ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
};
