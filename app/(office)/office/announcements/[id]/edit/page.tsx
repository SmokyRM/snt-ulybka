import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin, can } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import {
  getAnnouncement,
  updateAnnouncement,
  publishAnnouncement,
  type OfficeAnnouncementStatus,
} from "@/server/services/announcements";

export default async function OfficeAnnouncementEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getEffectiveSessionUser();
  if (!session) redirect(`/staff/login?next=/office/announcements/${id}/edit`);
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) redirect("/forbidden?reason=office.only&next=/office");
  
  try {
    assertCan(role, "announcements.view", undefined);
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  const canManage = can(role, "announcements.manage", undefined);

  let announcement;
  try {
    announcement = await getAnnouncement(id);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect(`/staff/login?next=/office/announcements/${id}/edit`);
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  if (!announcement) redirect("/office/announcements");

  if (!canManage) {
    redirect(`/office/announcements/${id}`);
  }

  async function save(formData: FormData) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect(`/staff/login?next=/office/announcements/${id}/edit`);
    const sessionRole = (session.role as Role | undefined) ?? "resident";
    try {
      assertCan(sessionRole, "announcements.manage", undefined);
    } catch {
      redirect("/forbidden");
    }
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const status = (formData.get("status") as OfficeAnnouncementStatus | null) ?? "draft";
    if (!title || !body) return;
    
    try {
      await updateAnnouncement(id, { title, body, status });
      const current = await getAnnouncement(id);
      if (current && status === "published" && current.status !== "published") {
        await publishAnnouncement(id, true);
      } else if (current && status === "draft" && current.status === "published") {
        await publishAnnouncement(id, false);
      }
      revalidatePath("/office/announcements");
      revalidatePath(`/office/announcements/${id}`);
      redirect(`/office/announcements/${id}`);
    } catch {
      redirect("/office/announcements");
    }
  }

  async function togglePublish(published: boolean) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect(`/staff/login?next=/office/announcements/${id}/edit`);
    const sessionRole = (session.role as Role | undefined) ?? "resident";
    try {
      assertCan(sessionRole, "announcements.manage", undefined);
    } catch {
      redirect("/forbidden");
    }
    try {
      await publishAnnouncement(id, published);
      revalidatePath("/office/announcements");
      revalidatePath(`/office/announcements/${id}`);
    } catch {
      // Игнорируем ошибки
    }
  }

  return (
    <div className="space-y-4" data-testid="announcement-editor">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Редактировать объявление</h1>
          <p className="text-sm text-zinc-600">Обновите текст или статус публикации</p>
        </div>
        <Link
          href={`/office/announcements/${id}`}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          К объявлению
        </Link>
      </div>

      <form action={save} className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm" data-testid="announcement-editor">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-800" htmlFor="title">
            Заголовок
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={announcement.title}
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
            defaultValue={announcement.body}
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
            defaultValue={announcement.status}
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
        </div>
      </form>
      <div className="flex gap-2">
        {announcement.status === "published" ? (
          <form action={async () => togglePublish(false)}>
            <button
              type="submit"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
              data-testid="announcement-publish"
            >
              В черновик
            </button>
          </form>
        ) : (
          <form action={async () => togglePublish(true)}>
            <button
              type="submit"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
              data-testid="announcement-publish"
            >
              Опубликовать
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
