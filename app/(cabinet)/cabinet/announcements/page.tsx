import { redirect } from "next/navigation";
import Link from "next/link";
import { listAnnouncements } from "@/lib/announcements.store";
import { getSessionUser } from "@/lib/session.server";

export default async function CabinetAnnouncementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/announcements");
  const items = listAnnouncements({ status: "published", audience: "residents" });

  return (
    <div className="space-y-4" data-testid="cabinet-announcements-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Объявления</h1>
        <p className="text-sm text-zinc-600">Публикации для жителей</p>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
            Объявлений пока нет.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              data-testid={`cabinet-announcements-item-${item.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{item.title}</div>
                  <div className="text-xs text-zinc-500">{new Date(item.updatedAt).toLocaleDateString("ru-RU")}</div>
                  <div className="mt-2 text-sm text-zinc-700 whitespace-pre-wrap">{item.body}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="text-sm text-[#5E704F]">
        <Link href="/contacts" className="font-semibold hover:underline">
          Подписаться на каналы правления
        </Link>
      </div>
    </div>
  );
}
