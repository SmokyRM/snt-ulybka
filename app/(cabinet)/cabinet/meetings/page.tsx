import CabinetHeader from "../_components/CabinetHeader";
import MeetingsClient from "./MeetingsClient";

export default function CabinetMeetingsPage() {
  return (
    <div className="space-y-4">
      <CabinetHeader title="Собрания" subtitle="Повестки и результаты" />
      <MeetingsClient />
    </div>
  );
}
