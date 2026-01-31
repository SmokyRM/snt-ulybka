import Link from "next/link";
import { redirect } from "next/navigation";

import { listMyNotifications, markNotificationRead } from "@/lib/resident/notifications.server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";

export default async function CabinetNotificationsPage() {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "resident") {
    redirect("/forbidden");
  }

  const notifications = await listMyNotifications();
  const headerInfo = await getCabinetHeaderInfo("Уведомления");

  async function markReadAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) {
      await markNotificationRead(id);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="space-y-6" data-testid="cabinet-notifications-root">
        <CabinetHeader
          title={headerInfo.title}
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />

        {notifications.length === 0 ? (
          <EmptyState
            title="Пока нет уведомлений"
            description="Когда появятся ответы по вашим обращениям — мы покажем их здесь."
            actionHref="/cabinet/appeals"
            actionLabel="Перейти к обращениям"
          />
        ) : (
          <CabinetCard title="История уведомлений" subtitle="Ответы правления и статус заявок">
            <div className="divide-y divide-zinc-100">
              {notifications.map((note) => {
                const isUnread = !note.readAt;
                return (
                  <div
                    key={note.id}
                    data-testid={`cabinet-notifications-row-${note.id}`}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isUnread ? "text-zinc-900" : "text-zinc-700"}`}>
                          {note.title}
                        </span>
                        {isUnread ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            Новое
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-zinc-600">{note.body}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(note.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                      {note.appealId ? (
                        <Link
                          href={`/cabinet/appeals/${note.appealId}`}
                          className="text-sm font-semibold text-[#5E704F] hover:underline"
                        >
                          Открыть обращение
                        </Link>
                      ) : null}
                    </div>
                    {isUnread ? (
                      <form action={markReadAction}>
                        <input type="hidden" name="id" value={note.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
                        >
                          Отметить прочитанным
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CabinetCard>
        )}
      </div>
    </main>
  );
}
