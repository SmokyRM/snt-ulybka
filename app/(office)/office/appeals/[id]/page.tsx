import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { headers } from "next/headers";
import type { Role } from "@/lib/permissions";
import { hasPermission, isOfficeRole, isStaffOrAdmin } from "@/lib/rbac";
import {
  getAppeal,
  updateAppealStatus,
  addAppealComment,
  getAppealActivity,
} from "@/server/services/appeals";
import {
  saveAppealReplyDraft,
  listAppealMessages,
  sendAppealReplyToResident,
} from "@/lib/office/appeals.server";
import type { AppealStatus } from "@/lib/office/types";
import { findRegistryByPlotNumber } from "@/lib/registry.store";
import { getRegistryUrl } from "@/lib/office/registryLinks";
import {
  assignToMeAction,
  unassignAppealAction,
  assignToUserAction,
  assignToRoleAction,
  setDueDateAction,
  applyTemplateAction,
} from "../actions";
import { ReplyBlock } from "../ReplyBlock";
import BackToListLink from "@/components/BackToListLink";
import AppLink from "@/components/AppLink";
import AppealToast from "./AppealToast";
import AppealActionsClient from "./AppealActionsClient";
import CommentFormWithTemplate from "./CommentFormWithTemplate";
import AppealActivityFeed from "./AppealActivityFeed";
import AppealTriageBlock from "./AppealTriageBlock";
import { listTemplates } from "@/server/services/templates";
import { getActionTemplates } from "@/lib/actionTemplates.store";
import { getAppliedRulesInfo } from "@/server/services/appealsRuleInfo";
import { readOk } from "@/lib/api/client";

const statusLabels: Record<AppealStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  needs_info: "Требует уточнения",
  closed: "Закрыто",
};

const statusClass: Record<AppealStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-amber-100 text-amber-800",
  needs_info: "bg-orange-100 text-orange-800",
  closed: "bg-emerald-100 text-emerald-800",
};

type Props = {
  params: { id: string };
  searchParams?: { success?: string };
};

export default async function OfficeAppealDetailPage({ params, searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/appeals");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }
  if (!hasPermission(role, "appeals.view")) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  let appeal;
  let activityLog;
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  const actionTemplates = getActionTemplates(role);
  let rulesInfo: ReturnType<typeof getAppliedRulesInfo> = {};
  let appealTemplates: Awaited<ReturnType<typeof import("@/lib/templates.store").getTemplatesForRole>> = [];
  try {
    appeal = await getAppeal(params.id);
    if (!appeal) {
      notFound();
    }
    activityLog = await getAppealActivity(params.id);
    // Получаем информацию о примененных правилах
    rulesInfo = getAppliedRulesInfo(activityLog);
    // Получаем шаблоны для вставки в комментарии
    try {
      templates = await listTemplates();
    } catch {
      // Игнорируем ошибки при получении шаблонов
    }
    // Sprint 5.4: Получаем шаблоны действий для обращений
    try {
      const { getTemplatesForRole } = await import("@/lib/templates.store");
      appealTemplates = getTemplatesForRole(role);
    } catch {
      // Игнорируем ошибки при получении шаблонов действий
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff-login?next=/office/appeals");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }
  const registryItem = appeal.plotNumber ? findRegistryByPlotNumber(appeal.plotNumber) : null;
  const allowTelegram = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_DEFAULT_CHAT_ID);

  async function takeInProgressAction(formData: FormData) {
    "use server";
    try {
      const appealId = formData.get("appealId");
      if (typeof appealId !== "string") return;
      await updateAppealStatus(appealId, { status: "in_progress" });
      revalidatePath("/office/appeals");
      revalidatePath(`/office/appeals/${appealId}`);
      redirect(`/office/appeals/${appealId}?success=taken`);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        redirect("/staff-login?next=/office/appeals");
      }
      if (error instanceof Error && error.message === "FORBIDDEN") {
        redirect("/forbidden?reason=office.only&next=/office");
      }
      throw error;
    }
  }

  async function requestClarificationAction(formData: FormData) {
    "use server";
    try {
      const appealId = formData.get("appealId");
      const comment = formData.get("comment");
      if (typeof appealId !== "string" || typeof comment !== "string" || !comment.trim()) return;
      await updateAppealStatus(appealId, { status: "needs_info", comment: comment.trim() });
      revalidatePath("/office/appeals");
      revalidatePath(`/office/appeals/${appealId}`);
      redirect(`/office/appeals/${appealId}?success=clarify`);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        redirect("/staff-login?next=/office/appeals");
      }
      if (error instanceof Error && error.message === "FORBIDDEN") {
        redirect("/forbidden?reason=office.only&next=/office");
      }
      throw error;
    }
  }

  async function closeAppealAction(formData: FormData) {
    "use server";
    try {
      const appealId = formData.get("appealId");
      const comment = formData.get("comment");
      if (typeof appealId !== "string") return;
      const commentText = typeof comment === "string" && comment.trim() ? comment.trim() : undefined;
      await updateAppealStatus(appealId, { status: "closed", comment: commentText });
      revalidatePath("/office/appeals");
      revalidatePath(`/office/appeals/${appealId}`);
      redirect(`/office/appeals/${appealId}?success=closed`);
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        redirect("/staff-login?next=/office/appeals");
      }
      if (error instanceof Error && error.message === "FORBIDDEN") {
        redirect("/forbidden?reason=office.only&next=/office");
      }
      throw error;
    }
  }

  async function rerunTriageAction(formData: FormData) {
    "use server";
    try {
      const appealId = formData.get("appealId");
      if (typeof appealId !== "string") return;
      
      // Проверяем права доступа (admin/chairman)
      const currentUser = await getEffectiveSessionUser();
      if (!currentUser) redirect("/staff-login?next=/office/appeals");
      const currentRole = (currentUser.role as Role | undefined) ?? "resident";
      if (currentRole !== "admin" && currentRole !== "chairman") {
        redirect("/forbidden?reason=office.only&next=/office");
      }

      // Вызываем API endpoint для применения триажа
      const headersList = await headers();
      const cookies = headersList.get("cookie") || "";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const response = await fetch(`${baseUrl}/api/admin/triage/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies,
        },
        body: JSON.stringify({ appealId }),
      });

      if (response.status === 401 || response.status === 403) {
        redirect("/forbidden?reason=office.only&next=/office");
      }
      await readOk<{
        ok: true;
        appealId: string;
        applied: boolean;
      }>(response);

      revalidatePath("/office/appeals");
      revalidatePath(`/office/appeals/${appealId}`);
      redirect(`/office/appeals/${appealId}?success=triage_rerun`);
    } catch (error) {
      if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message.includes("401"))) {
        redirect("/staff-login?next=/office/appeals");
      }
      if (error instanceof Error && (error.message === "FORBIDDEN" || error.message.includes("403"))) {
        redirect("/forbidden?reason=office.only&next=/office");
      }
      throw error;
    }
  }

  const messages = listAppealMessages(appeal.id);
  // accountant имеет read-only доступ (может смотреть, но не может менять статус)
  const canViewOnly = hasPermission(role, "appeals.view") && !hasPermission(role, "appeals.manage");

  return (
    <>
      <AppealToast />
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="office-appeal-details">
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
        {appeal.dueAt && appeal.status !== "closed" ? (
          <span className="text-xs font-semibold text-rose-600">
            Срок: {new Date(appeal.dueAt).toLocaleDateString("ru-RU")}
          </span>
        ) : null}
      </div>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-900">{appeal.title}</h1>
      <div className="mt-2 space-y-1 text-sm text-zinc-600">
        {appeal.authorName ? <div>Автор: {appeal.authorName}</div> : null}
        {appeal.authorPhone ? <div>Телефон: {appeal.authorPhone}</div> : null}
      </div>
      {/* Sprint 4.2: Ссылка на участок или "Участок не привязан" */}
      <div className="mt-3">
        {(() => {
          const registryUrl = getRegistryUrl(appeal.plotNumber, registryItem?.id);
          if (registryUrl) {
            return (
              <AppLink
                href={registryUrl}
                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
                data-testid="appeal-open-plot"
              >
                Открыть участок {appeal.plotNumber ? `(${appeal.plotNumber})` : ""} →
              </AppLink>
            );
          } else if (appeal.plotNumber) {
            // Если есть plotNumber, но не найден plotId - показываем plotNumber без ссылки
            return (
              <div className="text-sm text-zinc-600">
                Участок: {appeal.plotNumber} <span className="text-amber-600">(не найден в реестре)</span>
              </div>
            );
          } else {
            // Если нет plotNumber - показываем ссылку на привязку
            return (
              <AppLink
                href={`/office/quality?type=appeals&category=missingPlot&q=${encodeURIComponent(appeal.id)}`}
                className="inline-flex items-center justify-center rounded-lg border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300"
                data-testid="appeal-open-plot"
              >
                Участок не привязан (привязать) →
              </AppLink>
            );
          }
        })()}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-base text-zinc-800">{appeal.body}</p>

      {/* Информация о назначении */}
      {(appeal.assigneeRole || appeal.assigneeUserId || appeal.assignedAt) && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3" data-testid="appeal-assignment-info">
          <div className="text-sm font-semibold text-zinc-800 mb-2">Назначение:</div>
          <div className="space-y-1 text-sm text-zinc-600">
            {appeal.assigneeRole && (
              <div data-testid="appeal-assignee-role">Роль: {appeal.assigneeRole}</div>
            )}
            {appeal.assigneeUserId && (
              <div data-testid="appeal-assignee-user">Пользователь: {appeal.assigneeUserId}</div>
            )}
            {appeal.assignedAt && (
              <div data-testid="appeal-assigned-at">
                Назначено: {new Date(appeal.assignedAt).toLocaleString("ru-RU")}
              </div>
            )}
            {rulesInfo.assignmentRule && !appeal.assigneeUserId && (
              <div className="mt-2 rounded border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs text-blue-800" data-testid="appeal-assignment-rule-info">
                <span className="font-medium">Назначено правилом:</span> {rulesInfo.assignmentRule.ruleName}
                <a
                  href="#activity-feed"
                  className="ml-2 text-blue-600 underline hover:text-blue-800"
                  data-testid="appeal-rule-info-link"
                >
                  Лог событий →
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sprint 6.3: Блок авто-триажа */}
      <AppealTriageBlock logs={activityLog} appealId={appeal.id} />

      {/* Sprint 6.8: Кнопка перезапуска триажа (admin/chairman) */}
      {(role === "admin" || role === "chairman") && (
        <form action={rerunTriageAction} className="mt-4">
          <input type="hidden" name="appealId" value={appeal.id} />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:bg-zinc-50"
            data-testid="triage-rerun-btn"
          >
            Перезапустить триаж
          </button>
        </form>
      )}

      {/* Информация о статусе (если установлен правилом) */}
      {rulesInfo.statusRule && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3" data-testid="appeal-status-rule-info">
          <div className="text-sm font-semibold text-blue-800 mb-1">Статус установлен правилом:</div>
          <div className="text-sm text-blue-700">{rulesInfo.statusRule.ruleName}</div>
          <a
            href="#activity-feed"
            className="mt-1 inline-block text-xs text-blue-600 underline hover:text-blue-800"
            data-testid="appeal-status-rule-link"
          >
            Лог событий →
          </a>
        </div>
      )}

      {/* Информация о сроке (если установлен правилом) */}
      {rulesInfo.dueAtRule && appeal.dueAtSource === "auto" && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3" data-testid="appeal-dueat-rule-info">
          <div className="text-sm font-semibold text-blue-800 mb-1">Срок установлен правилом:</div>
          <div className="text-sm text-blue-700">{rulesInfo.dueAtRule.ruleName}</div>
          <a
            href="#activity-feed"
            className="mt-1 inline-block text-xs text-blue-600 underline hover:text-blue-800"
            data-testid="appeal-dueat-rule-link"
          >
            Лог событий →
          </a>
        </div>
      )}

      {hasPermission(role, "appeals.manage") ? (
        <div className="mt-6 grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
          {/* Назначения */}
          <div className="space-y-2" data-testid="office-appeal-assign">
            <label className="text-sm font-semibold text-zinc-800">Назначение</label>
            <div className="flex flex-wrap gap-2">
              {!appeal.assigneeUserId && !appeal.assigneeRole && (
                <form action={assignToMeAction}>
                  <input type="hidden" name="id" value={appeal.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5d41]"
                    data-testid="appeal-assign-to-me"
                  >
                    Назначить мне
                  </button>
                </form>
              )}
              {(appeal.assigneeUserId === user?.id || role === "admin" || role === "chairman") && (appeal.assigneeUserId || appeal.assigneeRole) && (
                <form action={unassignAppealAction}>
                  <input type="hidden" name="id" value={appeal.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F]"
                    data-testid="appeal-unassign"
                  >
                    Снять назначение
                  </button>
                </form>
              )}
              {(role === "admin" || role === "chairman") && (
                <>
                  <form action={assignToRoleAction} className="inline-flex">
                    <input type="hidden" name="id" value={appeal.id} />
                    <select
                      name="targetRole"
                      defaultValue=""
                      className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
                      onChange={(e) => {
                        if (e.target.value) {
                          e.target.form?.submit();
                        }
                      }}
                      data-testid="appeal-assign-to-role-select"
                    >
                      <option value="">Назначить роли...</option>
                      <option value="chairman">Председатель</option>
                      <option value="secretary">Секретарь</option>
                      <option value="accountant">Бухгалтер</option>
                      <option value="admin">Админ</option>
                    </select>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Срок */}
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
              data-testid="appeal-save-due-date"
            >
              Сохранить
            </button>
          </form>
        </div>
      ) : null}

      {/* Sprint 7.0: Шаблоны действий/ответов */}
      {hasPermission(role, "appeals.manage") && appealTemplates.length > 0 && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4" data-testid="appeal-templates-menu">
          <div className="mb-3 text-sm font-semibold text-zinc-800">Шаблоны действий</div>
          <div className="flex flex-wrap gap-2">
            {appealTemplates.map((template) => (
              <form key={template.key} action={applyTemplateAction}>
                <input type="hidden" name="id" value={appeal.id} />
                <input type="hidden" name="templateKey" value={template.key} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:bg-zinc-50"
                  data-testid={`template-btn-${template.key}`}
                >
                  {template.title}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

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
        <AppealActionsClient appealId={appeal.id} currentStatus={appeal.status} onUpdate={() => {}} />
      ) : canViewOnly ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4" data-testid="office-appeal-details">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-zinc-800">Статус:</label>
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`} data-testid="appeal-status">
              {statusLabels[appeal.status]}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">У вас нет прав для изменения статуса обращений.</p>
        </div>
      ) : null}

      {/* Лента активности */}
      {hasPermission(role, "appeals.view") && (
        <div id="activity-feed" className="mt-6 rounded-xl border border-zinc-200 bg-white p-4" data-testid="appeal-activity-feed-section">
          <AppealActivityFeed appealId={appeal.id} logs={activityLog} />
        </div>
      )}

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
        <CommentFormWithTemplate appealId={appeal.id} templates={templates} />
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

    </div>
    </>
  );
}

function isAppealStatus(value: string): value is AppealStatus {
  return value === "new" || value === "in_progress" || value === "needs_info" || value === "closed";
}

async function addCommentAction(formData: FormData) {
  "use server";
  try {
    const appealId = formData.get("appealId");
    const text = formData.get("comment");
    if (typeof appealId !== "string" || typeof text !== "string" || !text.trim()) return;
    await addAppealComment(appealId, { text: text.trim() });
    revalidatePath("/office/appeals");
    revalidatePath(`/office/appeals/${appealId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff-login?next=/office/appeals");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }
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
  if (!isStaffOrAdmin(sessionRole)) redirect("/forbidden");
  if (!hasPermission(sessionRole, "appeals.manage")) redirect("/forbidden");
  const appealId = formData.get("id");
  const text = formData.get("text");
  const channel = formData.get("channel");
  if (typeof appealId !== "string" || typeof text !== "string" || !text.trim()) return;
  const channelPlanned = channel === "telegram" ? "telegram" : "site";
  const roleForReply: "chairman" | "secretary" | "accountant" | "admin" = 
    sessionRole === "admin" ? "admin" : (isOfficeRole(sessionRole) ? sessionRole : "secretary");
  sendAppealReplyToResident(appealId, { text, channelPlanned }, roleForReply);
  revalidatePath(`/office/appeals/${appealId}`);
}
