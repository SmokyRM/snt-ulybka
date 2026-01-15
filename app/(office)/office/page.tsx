import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { getOfficeNavForRole } from "@/lib/officeNav";
import type { Role } from "@/lib/permissions";

export default async function OfficeIndex() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office");
  const role = (user.role as Role | undefined) ?? "resident";
  const nav = getOfficeNavForRole(role);
  const target = nav[0]?.href ?? "/office/dashboard";
  redirect(target);
}
