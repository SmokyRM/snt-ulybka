import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import {
  getOfficeAnnouncement,
  setOfficeAnnouncementStatus,
} from "@/lib/office/announcements.store";

export default async function OfficeAnnouncementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect(`/login?next=/office/announcements/${params.id}`);
  const role = (session.role as Role | undefined) ?? "resident";
  const normalizedRole = role === "admin" ? "chairman" : role;
  if (!can(normalizedRole, "office.announcements.manage")) {
    redirect("/forbidden");
  }

  const announcement = getOfficeAnnouncement(params.id);
  if (!announcement) notFound();
  const existing = announcement;

  async function publish() {
    "use server";
    setOfficeAnnouncementStatus(existing.id, "published");
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${existing.id}`);
  }

  async function unpublish() {
    "use server";
    setOfficeAnnouncementStatus(existing.id, "draft");
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${existing.id}`);
  }

  return (
    <div className="space-y-4" data-testid="office-announcement-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{existing.title}</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                existing.status === "published"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {existing.status === "published" ? "Опубликовано" : "Черновик"}
            </span>
            <span>Обновлено: {new Date(existing.updatedAt).toLocaleString("ru-RU")}</span>
          </div>
        </div>
        <Link
          href="/office/announcements"
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
        >
          К списку
        </Link>
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
        <div className="space-y-2 text-sm text-zinc-800">
          <div className="font-semibold">Текст</div>
          <div className="whitespace-pre-line rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">{existing.body}</div>
        </div>
        <div className="space-y-1 text-sm text-zinc-800">
          <div className="font-semibold">Автор</div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">
            {existing.authorRole ?? "Не указано"}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/office/announcements/${existing.id}/edit`}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
          data-testid="announcement-edit"
        >
          Редактировать
        </Link>
        {existing.status === "published" ? (
          <form action={unpublish}>
            <button
              type="submit"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
              data-testid="announcement-unpublish"
            >
              В черновик
            </button>
          </form>
        ) : (
          <form action={publish}>
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
