import type { Role } from "@/lib/permissions";
import { can } from "@/lib/permissions";
import { normalizeRole } from "@/lib/rbac";

export const canManageMeetingMinutes = (rawRole: string | null | undefined) => {
  const role = normalizeRole(rawRole) as Role;
  if (role === "admin") return true;
  return can(role, "office.documents.manage");
};
