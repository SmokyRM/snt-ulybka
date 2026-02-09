import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { isStaffOrAdmin } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import MeetingEditorClient from "../_components/MeetingEditorClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OfficeMeetingDetailPage({ params }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/meetings");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role) || !hasPermission(role, "meetings.manage")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const { id } = await params;

  return (
    <div className="space-y-6">
      <MeetingEditorClient meetingId={id} />
    </div>
  );
}
