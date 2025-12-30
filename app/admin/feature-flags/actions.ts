"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { FeatureFlagKey, setFeatureFlag } from "@/lib/featureFlags";

export async function toggleFeatureFlag(formData: FormData) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    throw new Error("forbidden");
  }
  const key = formData.get("key");
  const value = formData.get("value");
  if (typeof key !== "string" || typeof value !== "string") return;
  const enabled = value === "on";
  if (!["newPublicHome", "debtsV2", "cabinetMvp"].includes(key)) return;
  await setFeatureFlag(key as FeatureFlagKey, enabled);
  revalidatePath("/admin/feature-flags");
  revalidatePath("/admin/debts");
}
