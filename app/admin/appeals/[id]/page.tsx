import Link from "next/link";
import { redirect } from "next/navigation";
import { AppealStatus, getAppealById, updateAppealStatus } from "@/lib/appeals";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import BackToListLink from "@/components/BackToListLink";

async function updateAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");
  const id = (formData.get("id") as string | null) ?? "";
  const status = (formData.get("status") as AppealStatus | null) ?? "new";
  const reply = (formData.get("reply") as string | null) ?? undefined;
  await updateAppealStatus(id, status, reply ?? undefined);
  redirect(`/admin/appeals/${id}`);
}

const statusLabel = (s: AppealStatus) => {
  if (s === "draft") return "Черновик";
  if (s === "new") return "Новый";
  if (s === "in_progress") return "В работе";
  if (s === "answered") return "Отвечен";
  return "Закрыт";
};

type Props = {
  params: { id: string };
};

export default async function AppealDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin");
  const appeal = await getAppealById(params.id);
  if (!appeal) redirect("/admin/appeals");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Обращение</h1>
            <p className="text-sm text-zinc-600">ID: {appeal.id}</p>
          </div>
          <BackToListLink href="/admin/appeals" />
        </div>

        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 font-semibold text-zinc-700">
              {appeal.topic}
            </span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 font-semibold text-zinc-700">
              {statusLabel(appeal.status)}
            </span>
            <span>Создано: {new Date(appeal.createdAt).toLocaleString("ru-RU")}</span>
            <span>Обновлено: {new Date(appeal.updatedAt).toLocaleString("ru-RU")}</span>
            <span>Пользователь: {appeal.userId}</span>
          </div>
          <div className="text-sm text-zinc-900 whitespace-pre-wrap">{appeal.message}</div>
          <form action={updateAction} className="space-y-3">
            <input type="hidden" name="id" value={appeal.id} />
            <label className="flex items-center gap-2 text-sm">
              <span className="text-zinc-700">Статус:</span>
              <select
                name="status"
                defaultValue={appeal.status}
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
              >
                <option value="new">Новый</option>
                <option value="in_progress">В работе</option>
                <option value="answered">Отвечен</option>
                <option value="closed">Закрыт</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-800">
              Ответ правления
              <textarea
                name="reply"
                rows={3}
                defaultValue={appeal.adminReply ?? ""}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4d5d41]"
            >
              Сохранить
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
