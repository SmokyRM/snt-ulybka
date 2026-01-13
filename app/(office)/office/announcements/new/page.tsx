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
  const role = (user.role as Role | undefined) ?? "resident";
  if (!(role === "chairman" || role === "secretary" || role === "admin")) {
    redirect("/forbidden");
  }

  return (
    <div className="space-y-4" data-testid="office-announcements-new-root">
      <h1 className="text-2xl font-semibold text-zinc-900">Новое объявление</h1>
      <form action={createAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-announcement-new-form">
        <input type="hidden" name="authorRole" value={role} />
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
      </form>
    </div>
  );
}
