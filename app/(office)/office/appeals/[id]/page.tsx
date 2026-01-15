import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { hasPermission, isOfficeRole } from "@/lib/rbac";
import { addAppealComment } from "@/lib/appeals.store";
import {
  getAppeal,
  updateAppealStatus,
  saveAppealReplyDraft,
  listAppealMessages,
  sendAppealReplyToResident,
} from "@/lib/office/appeals.server";
import type { AppealStatus } from "@/lib/office/types";
import { findRegistryByPlotNumber } from "@/lib/registry.store";
import { assignAppealAction, setDueDateAction } from "../actions";
import { ReplyBlock } from "../ReplyBlock";
import BackToListLink from "@/components/BackToListLink";

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
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(role)) {
    redirect("/forbidden");
  }
  if (!hasPermission(role, "appeals.view")) {
    redirect("/forbidden");
  }

  const appeal = getAppeal(params.id);
  if (!appeal) {
    notFound();
  }
  const registryItem = appeal.plotNumber ? findRegistryByPlotNumber(appeal.plotNumber) : null;
  const allowTelegram = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_DEFAULT_CHAT_ID);

  async function updateStatus(formData: FormData) {
    "use server";
    const sessionUser = await getEffectiveSessionUser();
    if (!sessionUser) redirect("/staff-login?next=/office/appeals");
    const sessionRole = (sessionUser.role as Role | undefined) ?? "resident";
    if (!isOfficeRole(sessionRole)) {
      redirect("/forbidden");
    }
    if (!hasPermission(sessionRole, "appeals.manage")) redirect("/forbidden");
    const status = formData.get("status");
    const appealId = formData.get("appealId");
    if (typeof status !== "string" || typeof appealId !== "string" || !isAppealStatus(status)) return;
    updateAppealStatus(appealId, status, sessionRole === "admin" ? "admin" : sessionRole);
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${appealId}`);
  }

  const messages = listAppealMessages(appeal.id);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-appeal-detail">
      <div className="mb-4">
        <BackToListLink href="/office/appeals" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`}>
          {statusLabels[appeal.status]}
        </span>
        <span className="text-sm text-zinc-500">
          Обновлено {new Date(appeal.updatedAt).toLocaleDateString("ru-RU")} • Создано{" "}
          {new Date(appeal.createdAt).toLocaleDateString("ru-RU")}
        </span>
        {appeal.dueAt && appeal.status !== "done" ? (
          <span className="text-xs font-semibold text-rose-600">
            Срок: {new Date(appeal.dueAt).toLocaleDateString("ru-RU")}
          </span>
        ) : null}
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

      {hasPermission(role, "appeals.manage") ? (
        <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
          <form action={assignAppealAction} className="space-y-2" data-testid="office-appeal-assign">
            <input type="hidden" name="id" value={appeal.id} />
            <label className="text-sm font-semibold text-zinc-800">Исполнитель</label>
            <select
              name="assigneeRole"
              defaultValue={appeal.assigneeRole ?? ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            >
              <option value="">Не назначен</option>
              <option value="chairman">Председатель</option>
              <option value="secretary">Секретарь</option>
              <option value="accountant">Бухгалтер</option>
              <option value="admin">Админ</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Сохранить
            </button>
          </form>

          <form action={setDueDateAction} className="space-y-2" data-testid="office-appeal-due">
            <input type="hidden" name="id" value={appeal.id} />
            <label className="text-sm font-semibold text-zinc-800">Срок</label>
            <input
              type="date"
              name="dueAt"
              defaultValue={appeal.dueAt ? new Date(appeal.dueAt).toISOString().slice(0, 10) : ""}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:border-[#5E704F]"
            >
              Сохранить
            </button>
          </form>
        </div>
      ) : null}

      {hasPermission(role, "appeals.manage") ? (
        <ReplyBlock
          appealId={appeal.id}
          appealTitle={appeal.title}
          appealCreatedAt={appeal.createdAt}
          plotNumber={appeal.plotNumber}
          authorName={appeal.authorName}
          replyDraft={appeal.replyDraft}
          allowTelegram={allowTelegram}
          onSend={async (text, channel) => {
            const formData = new FormData();
            formData.set("id", appeal.id);
            formData.set("text", text);
            formData.set("channel", channel);
            await sendReplyAction(formData);
          }}
        />
      ) : null}

      {hasPermission(role, "appeals.manage") ? (
        <form action={updateStatus} className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <input type="hidden" name="appealId" value={appeal.id} />
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-zinc-800">Статус</label>
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`} data-testid="appeal-status">
              {statusLabels[appeal.status]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="status"
              value="in_progress"
              className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700"
              data-testid="office-appeal-action-in-progress"
            >
              В работу
            </button>
            <button
              type="submit"
              name="status"
              value="done"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              data-testid="office-appeal-action-close"
            >
              Закрыть
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4" data-testid="office-appeal-comments">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Комментарии</h2>
          <span className="text-xs text-zinc-500">Всего: {appeal.comments?.length ?? 0}</span>
        </div>
        {appeal.comments && appeal.comments.length > 0 ? (
          <div className="space-y-2">
            {appeal.comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500">
                  <span>{comment.authorRole === "chairman" ? "Правление" : comment.authorRole === "admin" ? "Админ" : "Секретарь"}</span>
                  <span>{new Date(comment.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <div className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">{comment.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            Комментариев пока нет.
          </div>
        )}
        <CommentForm appealId={appeal.id} />
      </div>

      <div className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-white p-4" data-testid="office-appeal-thread">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Лента</h2>
          <span className="text-xs text-zinc-500">Сообщений: {messages.length}</span>
        </div>
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Сообщений пока нет.</div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500">
                  <span>
                    {msg.direction === "outbound" ? "Ответ" : "Входящее"} • {msg.channel} • {msg.status}
                  </span>
                  <span>{new Date(msg.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <div className="mt-1 whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2 rounded-xl border border-zinc-200 bg-white p-4" data-testid="office-appeal-history">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">История</h2>
          <span className="text-xs text-zinc-500">Всего: {appeal.history?.length ?? 0}</span>
        </div>
        {appeal.history && appeal.history.length > 0 ? (
          <div className="space-y-2">
            {appeal.history.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
              >
                <span>{item.text}</span>
                <span className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("ru-RU")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            История изменений пока пустая.
          </div>
        )}
      </div>
    </div>
  );
}

function isAppealStatus(value: string): value is AppealStatus {
  return value === "new" || value === "in_progress" || value === "done";
}

async function addCommentAction(formData: FormData) {
  "use server";
  const sessionUser = await getEffectiveSessionUser();
  if (!sessionUser) redirect("/staff-login?next=/office/appeals");
  const sessionRole = (sessionUser.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(sessionRole)) redirect("/forbidden");
  if (!hasPermission(sessionRole, "appeals.manage")) redirect("/forbidden");
  const normalizedRole = sessionRole === "admin" ? "admin" : sessionRole;
  const appealId = formData.get("appealId");
  const text = formData.get("comment");
  if (typeof appealId !== "string" || typeof text !== "string") return;
  const canComment = normalizedRole === "admin" || normalizedRole === "chairman" || normalizedRole === "secretary";
  if (!canComment) redirect("/forbidden");
  addAppealComment(appealId, normalizedRole === "admin" ? "admin" : normalizedRole, text);
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

async function sendReplyAction(formData: FormData) {
  "use server";
  const sessionUser = await getEffectiveSessionUser();
  if (!sessionUser) redirect("/staff-login?next=/office/appeals");
  const sessionRole = (sessionUser.role as Role | undefined) ?? "resident";
  if (!isOfficeRole(sessionRole)) redirect("/forbidden");
  if (!hasPermission(sessionRole, "appeals.manage")) redirect("/forbidden");
  const appealId = formData.get("id");
  const text = formData.get("text");
  const channel = formData.get("channel");
  if (typeof appealId !== "string" || typeof text !== "string" || !text.trim()) return;
  const channelPlanned = channel === "telegram" ? "telegram" : "site";
  sendAppealReplyToResident(appealId, { text, channelPlanned }, sessionRole === "admin" ? "admin" : sessionRole);
  revalidatePath(`/office/appeals/${appealId}`);
}
