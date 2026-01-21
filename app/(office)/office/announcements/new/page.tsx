import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAnnouncement, publishAnnouncement } from "@/server/services/announcements";
import type { OfficeAnnouncementStatus } from "@/server/services/announcements";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { assertCan, isStaffOrAdmin, can } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";

export default async function OfficeAnnouncementNewPage() {
  const session = await getEffectiveSessionUser();
  if (!session) redirect("/staff/login?next=/office/announcements/new");
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) redirect("/forbidden?reason=office.only&next=/office");
  
  try {
    assertCan(role, "announcements.manage", undefined);
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  async function create(formData: FormData) {
    "use server";
    const session = await getEffectiveSessionUser();
    if (!session) redirect("/staff/login?next=/office/announcements/new");
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
      const created = await createAnnouncement({ title, body, status });
      if (status === "published") {
        await publishAnnouncement(created.id, true);
      }
      revalidatePath("/office/announcements");
      redirect(`/office/announcements/${created.id}/edit`);
    } catch {
      redirect("/office/announcements");
    }
  }

  return (
    <div className="space-y-4" data-testid="announcement-editor">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Новое объявление</h1>
        <p className="text-sm text-zinc-600">Создайте публикацию для жителей</p>
      </div>
      <form action={create} className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
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
