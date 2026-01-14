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

  if (!canAccess(normalizedRole, "office.announcements.read")) {
    const reason = getForbiddenReason(normalizedRole, "office.announcements.read");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/announcements")}`);
  }

  const role = (user.role as Role | undefined) ?? "resident";
  const canPublish = role === "chairman" || role === "secretary" || role === "admin";

  const status = statuses.some((s) => s.value === searchParams.status) ? searchParams.status : "all";
  const q = searchParams.q?.trim() ?? "";
  const items = listAnnouncements({
    status: status === "all" ? undefined : (status as "draft" | "published"),
    q,
  });

  return (
    <div className="space-y-4" data-testid="office-announcements-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Объявления</h1>
          <p className="text-sm text-zinc-600">Черновики и публикации для жителей/сотрудников</p>
        </div>
        <Link
          href="/office/announcements/new"
          data-testid="office-announcements-new"
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Создать
        </Link>
      </div>
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
            <Link
              href="/office/announcements/new"
              data-testid="office-announcements-empty-cta"
              className="ml-2 text-[#5E704F] hover:underline"
            >
              Создать объявление
            </Link>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
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
                    }`}
                  >
                    {item.status === "published" ? "Опубликовано" : "Черновик"}
                  </span>
                  {canPublish ? (
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
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300"
                        >
                          Удалить
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
