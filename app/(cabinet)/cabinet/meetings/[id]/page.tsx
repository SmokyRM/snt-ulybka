import CabinetHeader from "../../_components/CabinetHeader";
import MeetingDetailClient from "./MeetingDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CabinetMeetingDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <CabinetHeader title="Собрание" subtitle="Повестка и голосования" />
      <MeetingDetailClient meetingId={id} />
    </div>
  );
}
