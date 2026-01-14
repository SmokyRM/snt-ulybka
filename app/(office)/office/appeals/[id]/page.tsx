import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { can, type Role } from "@/lib/permissions";
import { addAppealComment, getAppeal, setAppealStatus, type AppealStatus } from "@/lib/appeals.store";
import { findRegistryByPlotNumber } from "@/lib/registry.store";

const statusLabels: Record<AppealStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  done: "Завершено",
};

const statusClass: Record<AppealStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
};

type Props = {
  params: { id: string };
};

export default async function OfficeAppealDetailPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!can(role === "admin" ? "chairman" : role, "office.appeals.manage")) {
    redirect("/forbidden");
  }

  const appeal = getAppeal(params.id);
  if (!appeal) {
    notFound();
  }
  const registryItem = appeal.plotNumber ? findRegistryByPlotNumber(appeal.plotNumber) : null;

  async function updateStatus(formData: FormData) {
    "use server";
    const sessionUser = await getSessionUser();
    if (!sessionUser) redirect("/login?next=/office/appeals");
    const sessionRole = (sessionUser.role as Role | undefined) ?? "resident";
    if (!can(sessionRole === "admin" ? "chairman" : sessionRole, "office.appeals.manage")) {
      redirect("/forbidden");
    }

    const status = formData.get("status");
    const appealId = formData.get("appealId");
    if (typeof status !== "string" || typeof appealId !== "string" || !isAppealStatus(status)) return;
    setAppealStatus(appealId, status);
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${appealId}`);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-appeal-root">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`}>
          {statusLabels[appeal.status]}
        </span>
        <span className="text-sm text-zinc-500">
          Обновлено {new Date(appeal.updatedAt).toLocaleDateString("ru-RU")} • Создано{" "}
          {new Date(appeal.createdAt).toLocaleDateString("ru-RU")}
        </span>
      </div>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-900">{appeal.title}</h1>
      <div className="mt-2 space-y-1 text-sm text-zinc-600">
        {appeal.plotNumber ? <div>Участок: {appeal.plotNumber}</div> : null}
        {appeal.authorName ? <div>Автор: {appeal.authorName}</div> : null}
        {appeal.authorPhone ? <div>Телефон: {appeal.authorPhone}</div> : null}
      </div>
      {registryItem ? (
        <div className="mt-3">
          <a
            href={`/office/registry/${registryItem.id}`}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
            data-testid="appeal-open-registry"
          >
            Открыть участок в реестре
          </a>
        </div>
      ) : null}
      <p className="mt-4 whitespace-pre-wrap text-base text-zinc-800">{appeal.body}</p>

      <form action={updateStatus} className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <input type="hidden" name="appealId" value={appeal.id} />
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-zinc-800">Статус</label>
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`} data-testid="appeal-status">
            {statusLabels[appeal.status]}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            name="status"
            defaultValue={appeal.status}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-[#5E704F] focus:outline-none"
            data-testid="appeal-status-select"
          >
            <option value="new">Новое</option>
            <option value="in_progress">В работе</option>
            <option value="done">Завершено</option>
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
            data-testid="appeal-status-submit"
          >
            Сохранить
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4" data-testid="appeal-comments">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Комментарии</h2>
          <span className="text-xs text-zinc-500">Всего: {appeal.comments.length}</span>
        </div>
        {appeal.comments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            Комментариев пока нет.
          </div>
        ) : (
          <div className="space-y-2">
            {appeal.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500">
                  <span>{comment.authorRole === "chairman" ? "Правление" : "Секретарь"}</span>
                  <span>{new Date(comment.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">{comment.text}</div>
              </div>
            ))}
          </div>
        )}
        <CommentForm appealId={appeal.id} />
      </div>
    </div>
  );
}

function isAppealStatus(value: string): value is AppealStatus {
  return value === "new" || value === "in_progress" || value === "done";
}

async function addCommentAction(formData: FormData) {
  "use server";
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?next=/office/appeals");
  const sessionRole = (sessionUser.role as Role | undefined) ?? "resident";
  const normalizedRole = sessionRole === "admin" ? "chairman" : sessionRole;
  if (!can(normalizedRole, "office.appeals.manage")) {
    redirect("/forbidden");
  }
  const appealId = formData.get("appealId");
  const text = formData.get("comment");
  if (typeof appealId !== "string" || typeof text !== "string") return;
  addAppealComment(appealId, normalizedRole === "secretary" ? "secretary" : "chairman", text);
  revalidatePath("/office/appeals");
  revalidatePath(`/office/appeals/${appealId}`);
}

function CommentForm({ appealId }: { appealId: string }) {
  return (
    <form action={addCommentAction} className="space-y-2">
      <input type="hidden" name="appealId" value={appealId} />
      <label className="block text-sm font-semibold text-zinc-800">Добавить комментарий</label>
      <textarea
        name="comment"
        rows={3}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-[#5E704F] focus:outline-none"
        placeholder="Напишите короткий комментарий"
        data-testid="appeal-comment-text"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
          data-testid="appeal-comment-submit"
        >
          Отправить
        </button>
      </div>
    </form>
  );
}
