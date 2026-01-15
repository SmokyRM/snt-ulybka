import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { AppealStatus, getAllAppeals, updateAppealStatus } from "@/lib/appeals";

async function updateAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin/appeals");
  const id = (formData.get("id") as string | null) ?? "";
  const status = (formData.get("status") as AppealStatus | null) ?? "new";
  const reply = (formData.get("reply") as string | null) ?? undefined;
  await updateAppealStatus(id, status, reply ?? undefined);
  redirect("/admin/appeals");
}

const statusLabel = (s: AppealStatus) => {
  if (s === "draft") return "Черновик";
  if (s === "new") return "Новый";
  if (s === "in_progress") return "В работе";
  if (s === "answered") return "Отвечен";
  return "Закрыт";
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAppealsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/staff/login?next=/admin/appeals");
  const params = (await Promise.resolve(searchParams)) ?? {};
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const topicFilter = typeof params.topic === "string" ? params.topic : "";
  const q = (typeof params.q === "string" ? params.q : "").toLowerCase();
  const appeals = await getAllAppeals();
  const filtered = appeals.filter((a) => {
    const sOk = statusFilter ? a.status === statusFilter : true;
    const tOk = topicFilter ? a.topic === topicFilter : true;
    const qOk = q ? a.message.toLowerCase().includes(q) || a.topic.toLowerCase().includes(q) : true;
    return sOk && tOk && qOk;
  });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6" data-testid="admin-appeals-root">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Обращения жителей</h1>
          <div className="text-sm text-zinc-700">Всего: {appeals.length}</div>
        </div>

        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-zinc-800">
            Статус
            <select
              name="status"
              defaultValue={statusFilter}
              className="mt-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="new">Новый</option>
              <option value="in_progress">В работе</option>
              <option value="answered">Отвечен</option>
              <option value="closed">Закрыт</option>
              <option value="draft">Черновик</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-800">
            Тема
            <input
              name="topic"
              defaultValue={topicFilter}
              className="mt-1 w-48 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Фильтр по теме"
            />
          </label>
          <label className="text-sm font-semibold text-zinc-800">
            Поиск
            <input
              name="q"
              defaultValue={q}
              className="mt-1 w-56 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Текст обращения"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
          >
            Применить
          </button>
        </form>

        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm" data-testid="admin-appeals-empty">
              Обращений по заданным параметрам нет.
            </div>
          )}

          {filtered.map((a) => (
            <form
              key={a.id}
              action={updateAction}
              className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                <div>ID: {a.id}</div>
                <div>Пользователь: {a.userId}</div>
                <div>{new Date(a.createdAt).toLocaleString("ru-RU")}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 font-semibold text-zinc-700">
                  {a.topic}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 font-semibold text-zinc-700">
                  {statusLabel(a.status)}
                </span>
                <span className="text-zinc-600">
                  Обновлено: {new Date(a.updatedAt).toLocaleString("ru-RU")}
                </span>
              </div>
              <div className="text-sm text-zinc-900 whitespace-pre-wrap">{a.message}</div>
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
                    <option value="closed">Закрыт</option>
                  </select>
                </label>
              </div>
              <label className="block text-sm text-zinc-800">
                Ответ правления
                <textarea
                  name="reply"
                  rows={2}
                  defaultValue={a.adminReply ?? ""}
                  className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#4d5d41]"
                >
                  Сохранить
                </button>
                <a
                  href={`/admin/appeals/${a.id}`}
                  className="text-xs font-semibold text-[#5E704F] hover:underline"
                >
                  Открыть детали
                </a>
              </div>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
