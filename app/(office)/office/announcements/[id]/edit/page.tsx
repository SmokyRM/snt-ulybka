import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { getOfficeAnnouncement, updateOfficeAnnouncement } from "@/lib/office/announcements.store";

export default async function OfficeAnnouncementEditPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect(`/login?next=/office/announcements/${params.id}/edit`);
  const role = (session.role as Role | undefined) ?? "resident";
  const normalizedRole = role === "admin" ? "chairman" : role;
  if (!can(normalizedRole, "office.announcements.manage")) {
    redirect("/forbidden");
  }

  const announcement = getOfficeAnnouncement(params.id);
  if (!announcement) notFound();
  const existing = announcement;

  async function save(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const status = (formData.get("status") as "draft" | "published" | null) ?? "draft";
    updateOfficeAnnouncement(existing.id, {
      title: title || "Без названия",
      body: body || "Текст объявления не указан",
      status: status === "published" ? "published" : "draft",
    });
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${existing.id}`);
    redirect(`/office/announcements/${existing.id}`);
  }

  return (
    <div className="space-y-4" data-testid="office-announcement-edit-form">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Редактировать объявление</h1>
          <p className="text-sm text-zinc-600">Измените текст и статус публикации</p>
        </div>
        <Link
          href={`/office/announcements/${existing.id}`}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          К объявлению
        </Link>
      </div>
      <form
        action={save}
        className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm"
      >
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="title">
            Заголовок
          </label>
          <input
            id="title"
            name="title"
            defaultValue={existing.title}
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
            rows={8}
            defaultValue={existing.body}
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
            defaultValue={existing.status}
            className="w-40 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#5E704F]"
          >
            <option value="draft">Черновик</option>
            <option value="published">Опубликовано</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4b5b40]"
            data-testid="announcement-save"
          >
            Сохранить
          </button>
          <Link
            href={`/office/announcements/${existing.id}`}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
