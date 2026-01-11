import Link from "next/link";
import { redirect } from "next/navigation";
import { listPublishedForAudience } from "@/lib/announcementsStore";
import { getSessionUser } from "@/lib/session.server";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { getCabinetContext } from "@/lib/cabinetContext";

export const metadata = {
  title: "Объявления — СНТ «Улыбка»",
  alternates: { canonical: "/cabinet/announcements" },
};

export default async function AnnouncementsPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?next=/cabinet/announcements");
  }
  const { hasDebt } = await getCabinetContext(session.id ?? "");
  const items = await listPublishedForAudience(hasDebt);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">Объявления</p>
          <h1 className="text-2xl font-semibold">Новости и важные объявления СНТ</h1>
          <p className="text-sm text-zinc-700">
            Публикуем решения правления, важные даты и обновления. Важные помечены бейджем.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Пока нет объявлений</div>
            <p className="text-sm text-zinc-700">Свежие новости публикуем в официальных каналах:</p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#5E704F]">
              {OFFICIAL_CHANNELS.telegram ? (
                <a
                  href={OFFICIAL_CHANNELS.telegram}
                  className="rounded-full border border-zinc-200 px-3 py-1 hover:border-[#5E704F]"
                  target="_blank"
                  rel="noreferrer"
                >
                  Telegram
                </a>
              ) : null}
              {OFFICIAL_CHANNELS.vk ? (
                <a
                  href={OFFICIAL_CHANNELS.vk}
                  className="rounded-full border border-zinc-200 px-3 py-1 hover:border-[#5E704F]"
                  target="_blank"
                  rel="noreferrer"
                >
                  VK
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-900">{item.title}</h2>
                    {item.isImportant ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Важно
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleString("ru-RU")
                      : new Date(item.updatedAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <details className="mt-2 text-sm text-zinc-700">
                  <summary className="cursor-pointer text-[#5E704F]">Показать текст</summary>
                  <div className="mt-2 whitespace-pre-wrap">{item.body}</div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
