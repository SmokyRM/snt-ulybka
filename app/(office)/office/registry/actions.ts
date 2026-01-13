"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { rejectOwnership, verifyOwnership } from "@/lib/residentsRegistry.store";

const assertCanManage = async () => {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/registry");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.registry.manage")) {
    redirect("/forbidden");
  }
};

export async function verifyOwnershipAction(formData: FormData) {
  await assertCanManage();
  const id = formData.get("id")?.toString() ?? "";
  if (!id) return;
  verifyOwnership(id);
  revalidatePath("/office/registry");
}

export async function rejectOwnershipAction(formData: FormData) {
  await assertCanManage();
  const id = formData.get("id")?.toString() ?? "";
  if (!id) return;
  rejectOwnership(id);
  revalidatePath("/office/registry");
}
