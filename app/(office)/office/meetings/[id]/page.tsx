import { redirect, notFound } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { canManageMeetingMinutes } from "@/lib/meetingMinutesAccess";
import { getMeetingMinutesById } from "@/lib/meetingMinutes";
import MeetingEditorClient from "../_components/MeetingEditorClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OfficeMeetingDetailPage({ params }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/meetings");
  if (!canManageMeetingMinutes(user.role)) redirect("/forbidden?reason=office.only&next=/office");

  const { id } = await params;
  const meeting = await getMeetingMinutesById(id);
  if (!meeting) notFound();

  return (
    <div className="space-y-6">
      <MeetingEditorClient initialMeeting={meeting} />
    </div>
  );
}
