<<<<<<< HEAD
import { redirect } from "next/navigation";
import { createAnnouncement } from "@/lib/announcements.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";

async function createAction(formData: FormData) {
  "use server";
  const title = ((formData.get("title") as string | null) ?? "").trim();
  const body = ((formData.get("body") as string | null) ?? "").trim();
  const audience = (formData.get("audience") as "all" | "residents" | "staff" | null) ?? "all";
  const authorRole = (formData.get("authorRole") as string | null) ?? "chairman";
  if (!title || !body) return;
  createAnnouncement({ title, body, audience, authorRole });
  redirect("/office/announcements");
}

export default async function OfficeAnnouncementNew() {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/announcements/new");
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/announcements/new")}`);
  }

  // Guard: office.announcements.write
  if (!canAccess(normalizedRole, "office.announcements.write")) {
    const reason = getForbiddenReason(normalizedRole, "office.announcements.write");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/announcements/new")}`);
  }

  // Get role label for authorRole
  const roleLabel = normalizedRole === "admin" ? "admin" : normalizedRole === "chairman" ? "chairman" : normalizedRole === "secretary" ? "secretary" : "chairman";

  return (
    <div className="space-y-4" data-testid="office-announcements-new-root">
      <h1 className="text-2xl font-semibold text-zinc-900">Новое объявление</h1>
      <form action={createAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-announcement-new-form">
        <input type="hidden" name="authorRole" value={roleLabel} />
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Заголовок
          <input
            name="title"
            required
            minLength={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Тема объявления"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Текст
          <textarea
            name="body"
            required
            minLength={10}
            rows={6}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Текст объявления"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Аудитория
          <select
            name="audience"
            defaultValue="all"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
          >
            <option value="all">Все</option>
            <option value="residents">Жители</option>
            <option value="staff">Сотрудники</option>
          </select>
        </label>
        <button
          type="submit"
          data-testid="office-announcements-new-submit"
          className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Создать
        </button>
=======
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
>>>>>>> 737c5be (codex snapshot)
      </form>
    </div>
  );
}
