import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission as hasActionPermission } from "@/lib/permissions";
import AccrualsGenerateClient from "./AccrualsGenerateClient";
import OfficeErrorState from "../../../_components/OfficeErrorState";

export default async function OfficeAccrualsGeneratePage() {
  const user = await getEffectiveSessionUser();
  if (!user) {
    redirect("/staff-login?next=/office/billing/accruals/generate");
  }
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  try {
    assertCan(role, "finance.read", "finance");
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const canGenerate = hasActionPermission(role, "billing.generate");
  if (!canGenerate) {
    return <OfficeErrorState message="Нет доступа к генерации начислений (403)." />;
  }

  return <AccrualsGenerateClient />;
}
