import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { createOfficeAnnouncement } from "@/lib/office/announcements.store";

export default async function OfficeAnnouncementNewPage() {
  const session = await getSessionUser();
  if (!session) redirect("/login?next=/office/announcements/new");
  const role = (session.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.announcements.manage")) {
    redirect("/forbidden");
  }

  async function create(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const status = (formData.get("status") as "draft" | "published" | null) ?? "draft";
    const announcement = createOfficeAnnouncement({
      title: title || "Без названия",
      body: body || "Текст объявления не указан",
      status: status === "published" ? "published" : "draft",
      authorRole: role,
    });
    revalidatePath("/office/announcements");
    redirect(`/office/announcements/${announcement.id}`);
  }

  return (
    <div className="space-y-4" data-testid="office-announcement-new-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Новое объявление</h1>
        <p className="text-sm text-zinc-600">Создайте публикацию для жителей</p>
      </div>
      <form
        action={create}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm"
        data-testid="office-announcement-new-form"
      >
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="title">
            Заголовок
          </label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="body">
            Текст
          </label>
          <textarea
            id="body"
            name="body"
            rows={6}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="status">
            Статус
          </label>
          <select
            id="status"
            name="status"
            defaultValue="draft"
            className="w-40 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
          >
            <option value="draft">Черновик</option>
            <option value="published">Опубликовано</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4b5b40]"
          >
            Сохранить
          </button>
          <Link
            href="/office/announcements"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
