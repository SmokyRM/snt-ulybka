<<<<<<< HEAD
import Link from "next/link";
import { redirect } from "next/navigation";
import { listAnnouncements, togglePublish } from "@/lib/announcements.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { removeAnnouncementAction } from "./actions";

const statuses = [
  { value: "all", label: "Все" },
  { value: "draft", label: "Черновики" },
  { value: "published", label: "Опубликованные" },
];

async function publishAction(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  togglePublish(id);
}

export default async function OfficeAnnouncementsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/announcements");
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/announcements")}`);
  }

  // Guard: office.announcements.read
  if (!canAccess(normalizedRole, "office.announcements.read")) {
    const reason = getForbiddenReason(normalizedRole, "office.announcements.read");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/announcements")}`);
  }

  // UI permissions
  const canRead = canAccess(normalizedRole, "office.announcements.read");
  const canWrite = canAccess(normalizedRole, "office.announcements.write");

  const status = statuses.some((s) => s.value === searchParams.status) ? searchParams.status : "all";
  const q = searchParams.q?.trim() ?? "";
  const items = listAnnouncements({
    status: status === "all" ? undefined : (status as "draft" | "published"),
    q,
  });
=======
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
>>>>>>> 737c5be (codex snapshot)

  return (
    <div className="space-y-4" data-testid="office-announcements-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Объявления</h1>
<<<<<<< HEAD
          <p className="text-sm text-zinc-600">Черновики и публикации для жителей/сотрудников</p>
        </div>
        {canWrite ? (
          <Link
            href="/office/announcements/new"
            data-testid="office-announcements-create"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
          >
            Создать
          </Link>
        ) : null}
      </div>
      {canRead && !canWrite ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="office-announcements-readonly-hint">
          Только просмотр
        </div>
      ) : null}
      <form className="flex flex-wrap gap-3 text-sm">
        <select
          name="status"
          defaultValue={status}
          data-testid="office-announcements-filter-status"
          className="rounded-lg border border-zinc-200 px-3 py-2"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск"
          data-testid="office-announcements-search"
          className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-full border border-zinc-200 px-4 py-2 font-semibold text-[#5E704F] hover:border-[#5E704F]"
        >
          Фильтровать
        </button>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600" data-testid="office-announcements-empty">
            Объявлений пока нет.
            {canWrite ? (
              <Link
                href="/office/announcements/new"
                data-testid="office-announcements-empty-cta"
                className="ml-2 text-[#5E704F] hover:underline"
              >
                Создать объявление
              </Link>
            ) : null}
=======
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
>>>>>>> 737c5be (codex snapshot)
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
<<<<<<< HEAD
              data-testid={`office-announcements-item-${item.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/office/announcements/${item.id}`} className="text-lg font-semibold text-zinc-900">
                    {item.title}
                  </Link>
                  <div className="text-xs text-zinc-500">
                    {new Date(item.updatedAt).toLocaleDateString("ru-RU")} · аудитория: {item.audience}
                  </div>
                  <div className="mt-2 text-sm text-zinc-700 line-clamp-3">{item.body}</div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.status === "published"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-100 text-zinc-700"
=======
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
>>>>>>> 737c5be (codex snapshot)
                    }`}
                  >
                    {item.status === "published" ? "Опубликовано" : "Черновик"}
                  </span>
<<<<<<< HEAD
                  {canWrite ? (
                    <div className="flex flex-wrap gap-2">
                      <form action={publishAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          data-testid={`office-announcements-publish-${item.id}`}
                          className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
                        >
                          {item.status === "published" ? "Снять с публикации" : "Опубликовать"}
                        </button>
                      </form>
                      <form action={removeAnnouncementAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          data-testid={`office-announcements-delete-${item.id}`}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300"
                        >
                          Удалить
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
=======
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
>>>>>>> 737c5be (codex snapshot)
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
