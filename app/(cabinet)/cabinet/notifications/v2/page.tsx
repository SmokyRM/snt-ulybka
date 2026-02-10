import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import NotificationsV2Client from "./NotificationsV2Client";

export default async function CabinetNotificationsV2Page() {
  const session = await getEffectiveSessionUser();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="space-y-6" data-testid="cabinet-notifications-v2-root">
        <div>
          <h1 className="text-2xl font-semibold">Уведомления</h1>
          <p className="text-sm text-zinc-600">Сообщения от правления и системные уведомления</p>
        </div>
        <NotificationsV2Client />
      </div>
    </main>
  );
}
