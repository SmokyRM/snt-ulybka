import Link from "next/link";
import { redirect } from "next/navigation";

import { listMyNotifications, markNotificationRead } from "@/lib/resident/notifications.server";
import { getEffectiveSessionUser } from "@/lib/session.server";

export default async function CabinetNotificationsPage() {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "resident") {
    redirect("/forbidden");
  }

  const notifications = await listMyNotifications();

  async function markReadAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) {
      await markNotificationRead(id);
    }
  }

  return (
    <div className="space-y-4" data-testid="cabinet-inbox-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Уведомления</h1>
        <p className="text-sm text-zinc-500">Ответы правления и статус ваших обращений.</p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500" data-testid="cabinet-inbox-empty">
          Пока нет уведомлений. Когда появятся ответы по вашим обращениям — мы покажем их здесь.
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="divide-y divide-zinc-100">
            {notifications.map((note) => {
              const isUnread = !note.readAt;
              return (
                <div
                  key={note.id}
                  data-testid={`cabinet-inbox-item-${note.id}`}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isUnread ? "text-zinc-900" : "text-zinc-700"}`}>
                        {note.title}
                      </span>
                      {isUnread ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Новое</span>
                      ) : null}
                    </div>
                    <p className="text-sm text-zinc-600">{note.body}</p>
                    <p className="text-xs text-zinc-400">
                      {new Date(note.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    {note.appealId ? (
                      <Link href={`/cabinet/appeals`} className="text-sm font-semibold text-[#5E704F] hover:underline">
                        Открыть обращения
                      </Link>
                    ) : null}
                  </div>
                  {isUnread ? (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={note.id} />
                      <button
                        type="submit"
                        data-testid={`cabinet-inbox-mark-read-${note.id}`}
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
        </div>
      )}
    </div>
  );
}
