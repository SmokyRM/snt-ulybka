import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { hasPermission, isOfficeRole } from "@/lib/rbac";
import type { Role } from "@/lib/permissions";
import { getAnnouncement, setAnnouncementPublished, updateAnnouncement } from "@/lib/office/announcements.server";
import type { OfficeAnnouncementStatus } from "@/lib/office/announcements.server";
import BackToListLink from "@/components/BackToListLink";

export default async function OfficeAnnouncementDetailPage({ params }: { params: { id: string } }) {
  const session = await getEffectiveSessionUser();
  if (!session) redirect(`/staff-login?next=/office/announcements/${params.id}`);
  const role = (session.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(role)) redirect("/forbidden");
  if (!hasPermission(role, "announcements.view")) redirect("/forbidden");
  const canManage = hasPermission(role, "announcements.manage");

  const announcement = getAnnouncement(params.id);
  if (!announcement) notFound();

  async function togglePublish(nextStatus: OfficeAnnouncementStatus) {
    "use server";
    const sessionUser = await getEffectiveSessionUser();
    if (!sessionUser) redirect(`/staff-login?next=/office/announcements/${params.id}`);
    const sessionRole = (sessionUser.role as Role | undefined) ?? "resident";
    if (!hasPermission(sessionRole, "announcements.manage")) redirect("/forbidden");
    setAnnouncementPublished(params.id, nextStatus === "published");
    revalidatePath("/office/announcements");
    revalidatePath(`/office/announcements/${params.id}`);
  }

  return (
    <div className="space-y-4" data-testid="office-announcement-root">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{announcement.title}</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                announcement.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {announcement.status === "published" ? "Опубликовано" : "Черновик"}
            </span>
            <span>Обновлено: {new Date(announcement.updatedAt).toLocaleString("ru-RU")}</span>
          </div>
        </div>
        <BackToListLink href="/office/announcements" />
      </div>

      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white px-4 py-5 shadow-sm">
        <div className="space-y-2 text-sm text-zinc-800">
          <div className="font-semibold">Текст</div>
          <div className="whitespace-pre-line rounded-lg bg-zinc-50 px-3 py-2 text-zinc-700">{announcement.body}</div>
        </div>
        <div className="text-xs text-zinc-500">
          Создано: {new Date(announcement.createdAt).toLocaleString("ru-RU")}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {canManage ? (
          <Link
            href={`/office/announcements/${announcement.id}/edit`}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            data-testid="announcement-edit"
          >
            Редактировать
          </Link>
        ) : null}
        {canManage ? (
          announcement.status === "published" ? (
            <form action={async () => togglePublish("draft")}>
              <button
                type="submit"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
                data-testid="announcement-unpublish"
              >
                В черновик
              </button>
            </form>
          ) : (
            <form action={async () => togglePublish("published")}>
              <button
                type="submit"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
                data-testid="announcement-publish"
              >
                Опубликовать
              </button>
            </form>
          )
        ) : null}
      </div>
    </div>
  );
}
