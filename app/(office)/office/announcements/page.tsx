import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import {
  listOfficeAnnouncements,
  type OfficeAnnouncementStatus,
  setOfficeAnnouncementStatus,
} from "@/lib/office/announcements.store";

type SearchParams = { q?: string; status?: OfficeAnnouncementStatus };

export default async function OfficeAnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/office/announcements");
  const role = (session.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.announcements.manage")) {
    redirect("/forbidden");
  }

  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status ?? undefined;
  const items = listOfficeAnnouncements({ q, status });

  async function publish(id: string) {
    "use server";
    setOfficeAnnouncementStatus(id, "published");
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${id}`);
  }

  async function unpublish(id: string) {
    "use server";
    setOfficeAnnouncementStatus(id, "draft");
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${id}`);
  }

  return (
    <div className="space-y-4" data-testid="office-announcements-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Объявления</h1>
          <p className="text-sm text-zinc-600">Публикации для жителей</p>
        </div>
        <Link
          href="/office/announcements/new"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4b5b40]"
        >
          Новое объявление
        </Link>
      </div>

      <form className="flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Поиск"
          className="w-full max-w-xs rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#5E704F]"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="w-40 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#5E704F]"
        >
          <option value="">Все</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          Применить
        </button>
      </form>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">
            Пока нет объявлений.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              data-testid="office-announcement-row"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link href={`/office/announcements/${item.id}`} className="text-base font-semibold text-zinc-900 hover:text-[#5E704F]">
                    {item.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      item.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status === "published" ? "Опубликовано" : "Черновик"}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 line-clamp-2">{item.body}</p>
                <div className="text-xs text-zinc-500">
                  Обновлено: {new Date(item.updatedAt).toLocaleString("ru-RU")}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === "published" ? (
                  <form action={unpublish.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                    >
                      В черновик
                    </button>
                  </form>
                ) : (
                  <form action={publish.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                    >
                      Опубликовать
                    </button>
                  </form>
                )}
                <Link
                  href={`/office/announcements/${item.id}`}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                >
                  Открыть
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
