import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session.server";
import {
  Announcement,
  AnnouncementAudience,
  AnnouncementStatus,
  createAnnouncement,
  listAnnouncements,
  updateAnnouncement,
} from "@/lib/announcementsStore";

type FormState = { error?: string };

const requireRole = (role?: string | null) =>
  role === "admin" || role === "board" || role === "chair";

export default async function AdminAnnouncementsPage() {
  const user = await getSessionUser();
  if (!user || !requireRole(user.role)) {
    redirect("/staff/login?next=/admin/announcements");
  }

  const announcements = await listAnnouncements(true);

  async function createAction(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!session || !requireRole(session.role)) return;
    const title = (formData.get("title") as string | null)?.trim() ?? "";
    const body = (formData.get("body") as string | null)?.trim() ?? "";
    const isImportant = formData.get("isImportant") === "on";
    const status = (formData.get("status") as AnnouncementStatus) ?? "draft";
    const audience = (formData.get("audience") as AnnouncementAudience) ?? "all";
    if (title.length < 3 || body.length < 10) {
      return;
    }
    await createAnnouncement({
      title,
      body,
      status,
      isImportant,
      audience,
      createdBy: session.id ?? "unknown",
    });
    redirect("/admin/announcements");
  }

  async function updateAction(formData: FormData) {
    "use server";
    const session = await getSessionUser();
    if (!session || !requireRole(session.role)) return;
    const id = (formData.get("id") as string | null) ?? "";
    const status = (formData.get("status") as AnnouncementStatus) ?? "draft";
    await updateAnnouncement(id, { status });
    redirect("/admin/announcements");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6" data-testid="admin-announcements-root">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
              Админка
            </p>
            <h1 className="text-2xl font-semibold">Объявления</h1>
          </div>
          <Link
            href="/cabinet/announcements"
            className="text-sm font-semibold text-[#5E704F] hover:underline"
          >
            Смотреть как пользователь
          </Link>
        </div>

        <form action={createAction} className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-800">Создать объявление</div>
          <label className="block text-sm font-semibold text-zinc-800">
            Заголовок
            <input
              name="title"
              minLength={3}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-800">
            Текст
            <textarea
              name="body"
              rows={4}
              minLength={10}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isImportant" /> Важно
            </label>
            <label className="flex items-center gap-2">
              Аудитория:
              <select name="audience" className="rounded-lg border border-zinc-300 px-2 py-1 text-sm">
                <option value="all">Все</option>
                <option value="debtors">Только с долгом</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              Статус:
              <select name="status" className="rounded-lg border border-zinc-300 px-2 py-1 text-sm">
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4b5b40]"
          >
            Сохранить
          </button>
        </form>

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm" data-testid="admin-announcements-empty">
              Объявлений пока нет.
            </div>
          ) : (
            announcements.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900">{item.title}</span>
                  {item.isImportant ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Важно
                    </span>
                  ) : null}
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700">
                    {item.status === "published" ? "Опубликовано" : "Черновик"}
                  </span>
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[11px] text-zinc-700">
                    {item.audience === "all" ? "Все" : "Только должники"}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString("ru-RU")
                    : "Не опубликовано"}
                </span>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{item.body}</div>
              <form action={updateAction} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <input type="hidden" name="id" value={item.id} />
                <select
                  name="status"
                  defaultValue={item.status}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="draft">Черновик</option>
                  <option value="published">Опубликовано</option>
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-zinc-200 px-3 py-1 font-semibold text-[#5E704F] hover:border-[#5E704F]"
                >
                  Обновить
                </button>
              </form>
            </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
