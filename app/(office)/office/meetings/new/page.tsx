import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import MeetingEditorClient from "../_components/MeetingEditorClient";

export default async function OfficeMeetingNewPage() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/meetings/new");
  if (!canManageMeetingMinutes(user.role)) redirect("/forbidden?reason=office.only&next=/office");

  return (
    <div className="space-y-6">
      <MeetingEditorClient initialMeeting={null} />
    </div>
  );
}
