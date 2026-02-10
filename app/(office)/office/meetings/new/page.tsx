import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import MeetingEditorClient from "../_components/MeetingEditorClient";

export default async function OfficeMeetingNewPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/meetings/new");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role) || !hasPermission(role, "meetings.manage")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  return (
    <div className="space-y-6">
      <MeetingEditorClient />
    </div>
  );
}
