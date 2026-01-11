import "server-only";

import { cookies } from "next/headers";
import { qaEnabled, QA_COOKIE, type QaScenario } from "./qaScenario";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export const getQaScenarioFromCookies = async (
  store?: CookieStore,
): Promise<QaScenario | null> => {
  if (!qaEnabled()) return null;
  const jar = store ?? (await cookies());
  const value = jar.get(QA_COOKIE)?.value;
  if (
    value === "guest" ||
    value === "resident_ok" ||
    value === "resident_debtor" ||
    value === "admin"
  ) {
    return value;
  }
  return null;
};

export const writeQaScenarioCookie = async (scenario: QaScenario | null) => {
  if (!qaEnabled()) return;
  const jar = await cookies();
  if (!scenario) {
    jar.set(QA_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }
  jar.set(QA_COOKIE, scenario, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
};

export const applyQaDebtOverride = (hasDebt: boolean, scenario: QaScenario | null) => {
  if (!qaEnabled()) return hasDebt;
  if (scenario === "resident_debtor") return true;
  if (scenario === "resident_ok") return false;
  return hasDebt;
};
