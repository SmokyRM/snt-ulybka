import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getAllAppeals, updateAppealStatus, AppealStatus } from "@/lib/appeals";

async function updateAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const id = (formData.get("id") as string | null) ?? "";
  const status = (formData.get("status") as AppealStatus | null) ?? "new";
  const reply = (formData.get("reply") as string | null) ?? undefined;
  await updateAppealStatus(id, status, reply);
  redirect("/admin/appeals");
}

const statusLabel = (s: AppealStatus) =>
  s === "new" ? "Новый" : s === "in_progress" ? "В работе" : "Отвечен";

export default async function AdminAppealsPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const appeals = await getAllAppeals();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Обращения жителей</h1>
          <div className="text-sm text-zinc-700">Всего: {appeals.length}</div>
        </div>

        <div className="space-y-4">
          {appeals.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
              Обращений пока нет.
            </div>
          )}

          {appeals.map((a) => (
            <form
              key={a.id}
              action={updateAction}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                <div>ID: {a.id}</div>
                <div>Пользователь: {a.userId}</div>
                <div>{new Date(a.createdAt).toLocaleString("ru-RU")}</div>
              </div>
              <div className="text-sm text-zinc-900">{a.text}</div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <input type="hidden" name="id" value={a.id} />
                <label className="flex items-center gap-2">
                  <span className="text-zinc-700">Статус:</span>
                  <select
                    name="status"
                    defaultValue={a.status}
                    className="rounded border border-zinc-300 px-2 py-1 text-sm"
                  >
                    <option value="new">Новый</option>
                    <option value="in_progress">В работе</option>
                    <option value="answered">Отвечен</option>
                  </select>
                </label>
                <div className="text-xs text-zinc-600">Текущий: {statusLabel(a.status)}</div>
              </div>
              <label className="block text-sm text-zinc-800">
                Ответ администратора
                <textarea
                  name="reply"
                  rows={2}
                  defaultValue={a.adminReply ?? ""}
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
          ))}
        </div>
      </div>
    </main>
  );
}
