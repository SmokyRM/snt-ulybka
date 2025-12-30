"use server";

import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { seedTestData, SeedSummary } from "@/lib/seedTestData";

export type SeedActionState =
  | { ok: true; summary: SeedSummary }
  | { ok: false; error: string };

export const seedTestDataAction = async (): Promise<SeedActionState> => {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return { ok: false, error: "forbidden" };
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "not_available_in_production" };
  }
  try {
    const summary = await seedTestData();
    return { ok: true, summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
};
