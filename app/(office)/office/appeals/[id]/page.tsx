import { redirect, notFound } from "next/navigation";
import { getAppeal } from "@/lib/appeals.store";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { saveStatusAction, sendReplyAction } from "../actions";

export default async function OfficeAppealDetail({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const rawRole = user.role as import("@/lib/rbac").Role | "user" | "board" | undefined;
  const { canAccess, getForbiddenReason } = await import("@/lib/rbac");
  const normalizedRole: import("@/lib/rbac").Role =
    rawRole === "user" || rawRole === "board"
      ? "resident"
      : rawRole ?? "guest";

  // Guard: office.access
  if (!canAccess(normalizedRole, "office.access")) {
    const reason = getForbiddenReason(normalizedRole, "office.access");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/appeals")}`);
  }

  // Guard: office.appeals.read
  if (!canAccess(normalizedRole, "office.appeals.read")) {
    const reason = getForbiddenReason(normalizedRole, "office.appeals.read");
    redirect(`/forbidden?reason=${encodeURIComponent(reason)}&next=${encodeURIComponent("/office/appeals")}`);
  }

  // UI permissions
  const canRead = canAccess(normalizedRole, "office.appeals.read");
  const canComment = canAccess(normalizedRole, "office.appeals.comment");
  const canStatus = canAccess(normalizedRole, "office.appeals.status");

  const resolvedParams = params instanceof Promise ? await params : params;
  const appealId = decodeURIComponent(resolvedParams.id).trim();
  const appeal = getAppeal(appealId);
  if (!appeal) notFound();

  return (
    <div className="space-y-4" data-testid="office-appeal-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{appeal.title}</h1>
        <p className="text-sm text-zinc-600">
          Статус: <span data-testid="office-appeal-status">{appeal.status}</span>
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
        <div className="font-semibold text-zinc-900">Описание</div>
        <p className="mt-2 whitespace-pre-wrap text-zinc-700">{appeal.body}</p>
        <div className="mt-3 text-xs text-zinc-500">
          Автор: {appeal.authorName ?? "—"} · {new Date(appeal.createdAt).toLocaleString("ru-RU")}
        </div>
      </div>

      {canRead && !canComment && !canStatus ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-testid="office-appeal-readonly-hint">
          Только просмотр
        </div>
      ) : null}

      {canStatus ? (
        <form
          action={saveStatusAction}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="id" value={appeal.id} />
          <label className="text-sm font-medium text-zinc-800">
            Статус
            <select name="status" defaultValue={appeal.status} className="ml-2 rounded-lg border border-zinc-200 px-3 py-2">
              <option value="new">Новая</option>
              <option value="in_progress">В работе</option>
              <option value="closed">Закрыта</option>
            </select>
          </label>
          <button
            type="submit"
            data-testid="office-appeals-status"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
          >
            Сохранить
          </button>
        </form>
      ) : null}

      {canComment ? (
        <form
          action={sendReplyAction}
          className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="id" value={appeal.id} />
          <label className="block text-sm font-semibold text-zinc-900">
            Ответ / комментарий
            <textarea
              name="reply"
              data-testid="office-appeals-comment"
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="Короткий ответ или комментарий"
            />
          </label>
          <button
            type="submit"
            data-testid="office-appeals-comment-submit"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
          >
            Отправить
          </button>
        </form>
      ) : null}

      {appeal.comments && appeal.comments.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Комментарии</div>
          <div className="mt-2 space-y-2 text-sm text-zinc-700">
            {appeal.comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-zinc-50 px-3 py-2">
                <div className="text-xs text-zinc-500">
                  {new Date(c.createdAt).toLocaleString("ru-RU")} · {c.author ?? "office"}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
