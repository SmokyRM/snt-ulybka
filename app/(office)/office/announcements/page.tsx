import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin, can } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { listAnnouncements, publishAnnouncement } from "@/server/services/announcements";
import type { OfficeAnnouncementStatus } from "@/server/services/announcements";

const statusLabels: Record<OfficeAnnouncementStatus | "archived", string> = {
  draft: "Черновик",
  published: "Опубликовано",
  archived: "Архив",
};

type SearchParams = { q?: string; status?: OfficeAnnouncementStatus | "archived" };

export default async function OfficeAnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getEffectiveSessionUser();
  if (!session) redirect("/staff/login?next=/office/announcements");
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) redirect("/forbidden?reason=office.only&next=/office");
  
  try {
    assertCan(role, "announcements.view", undefined);
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  const canManage = can(role, "announcements.manage", undefined);

  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status;
  
  let items;
  try {
    items = await listAnnouncements({ status, q });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff/login?next=/office/announcements");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  async function togglePublish(id: string, published: boolean) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect("/staff/login?next=/office/announcements");
    const sessionRole = (session.role as Role | undefined) ?? "resident";
    try {
      assertCan(sessionRole, "announcements.manage", undefined);
    } catch {
      redirect("/forbidden");
    }
    try {
      await publishAnnouncement(id, published);
    } catch {
      // Игнорируем ошибки
    }
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${id}`);
  }

  return (
    <div className="space-y-4" data-testid="office-announcements-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Объявления</h1>
          <p className="text-sm text-zinc-600">Публикации для жителей</p>
        </div>
        {canManage ? (
          <Link
            href="/office/announcements/new"
            data-testid="office-announcements-create"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4b5b40]"
          >
            Новое объявление
          </Link>
        ) : null}
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
          <option value="archived">Архив</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          Применить
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm" data-testid="office-announcements-list">
        <div className="divide-y divide-zinc-100">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-zinc-600">Пока нет объявлений.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                data-testid={`office-announcements-item-${item.id}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/office/announcements/${item.id}`} className="text-base font-semibold text-zinc-900 hover:text-[#5E704F]">
                      {item.title}
                    </Link>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        item.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {statusLabels[item.status]}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-2">{item.body}</p>
                  <div className="text-xs text-zinc-500">
                    Обновлено: {new Date(item.updatedAt).toLocaleString("ru-RU")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage ? (
                    <form action={async () => togglePublish(item.id, item.status !== "published")}>
                      <button
                        type="submit"
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
                        data-testid="announcement-publish"
                      >
                        {item.status === "published" ? "В черновик" : "Опубликовать"}
                      </button>
                    </form>
                  ) : null}
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
    </div>
  );
}
