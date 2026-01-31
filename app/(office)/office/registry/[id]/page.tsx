import { notFound, redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { assertCan, isStaffOrAdmin } from "@/lib/rbac";
import { can } from "@/lib/permissions";
import { getPlot } from "@/server/services/plots";
import { listByPlotId } from "@/server/services/appeals";
import { listByPlotWithRelated } from "@/server/services/activity";
import { listDebts } from "@/lib/billing.store";
import { listOfficeNotes } from "@/lib/officeNotes.store";
import { listAuditLogs } from "@/lib/mockDb";
import type { AppealStatus } from "@/lib/office/types";
import { overdue, dueSoon } from "@/lib/sla";
import AppLink from "@/components/AppLink";
import PlotContactsClient from "./PlotContactsClient";
import PlotNotesClient from "./PlotNotesClient";

type Props = {
  params: Promise<{ id: string }>;
};

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

export default async function PlotDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/registry");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  try {
    assertCan(role, "registry.view", undefined);
  } catch {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  let plot;
  try {
    plot = await getPlot(id);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/staff-login?next=/office/registry");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      redirect("/forbidden?reason=office.only&next=/office");
    }
    throw error;
  }

  if (!plot) {
    notFound();
  }

  const canManageRegistry = can(role, "office.registry.manage");

  // Получаем связанные обращения
  let appeals: Awaited<ReturnType<typeof listByPlotId>> = [];
  try {
    appeals = await listByPlotId(id);
  } catch {
    // Игнорируем ошибки при получении обращений
  }

  // Sprint 4.1: Получаем последние 10 обращений
  const openAppeals = appeals.filter((a) => a.status !== "closed");
  const recentAppeals = appeals.slice(0, 10);

  // Получаем activity feed
  let activities: Awaited<ReturnType<typeof listByPlotWithRelated>> = [];
  try {
    activities = await listByPlotWithRelated(id);
  } catch {
    // Игнорируем ошибки при получении активности
  }

  // Получаем заметки сотрудников
  const officeNotes = listOfficeNotes(id);

  const auditLogs = listAuditLogs({ entityId: id, limit: 20 });

  // Получаем финансы (только для accountant/admin/chairman)
  let financeData = null;
  const canViewFinance = role === "accountant" || role === "admin" || role === "chairman";
  if (canViewFinance) {
    try {
      const debts = listDebts({ q: plot.plotNumber });
      const plotDebt = debts.find((d) => d.plotId.toLowerCase().includes(plot.plotNumber.toLowerCase()));
      if (plotDebt) {
        financeData = {
          debt: plotDebt.debt,
          chargedTotal: plotDebt.chargedTotal,
          paidTotal: plotDebt.paidTotal,
        };
      }
    } catch {
      // Игнорируем ошибки при получении финансов
    }
  }

  return (
    <div className="space-y-6" data-testid="registry-root">
      {/* Sprint 4.1: Заголовок с участком №/ID, статусом, адресом */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900" data-testid="registry-title">
            Участок {plot.plotNumber}
            {plot.id && <span className="text-lg text-zinc-500"> (ID: {plot.id})</span>}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {plot.status && (
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                plot.status === "verified" ? "bg-emerald-100 text-emerald-800" :
                plot.status === "pending" ? "bg-amber-100 text-amber-800" :
                "bg-zinc-100 text-zinc-700"
              }`} data-testid="registry-status">
                {plot.status === "verified" ? "Подтверждено" :
                 plot.status === "pending" ? "На проверке" :
                 plot.status === "draft" ? "Черновик" : plot.status}
              </span>
            )}
            {plot.street && (
              <span className="text-sm text-zinc-600" data-testid="registry-address">
                {plot.street}
              </span>
            )}
          </div>
        </div>
        <AppLink
          href="/office/registry"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          data-testid="plot-detail-back-link"
        >
          ← Назад к списку
        </AppLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sprint 4.1: Контакты владельца(ев) */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="registry-contacts">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Контакты владельца(ев)</h2>
            <PlotContactsClient
              plotId={id}
              ownerName={plot.ownerName}
              phone={plot.phone}
              email={plot.email}
              contactVerifiedAt={plot.contactVerifiedAt}
              contactVerifiedBy={plot.contactVerifiedBy}
              canManage={canManageRegistry}
            />
          </section>

          {/* Sprint 4.1: Обращения по участку (последние 10) с бейджами dueSoon/overdue */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="registry-appeals">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                Обращения ({appeals.length})
              </h2>
              {openAppeals.length > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Открытых: {openAppeals.length}
                </span>
              )}
            </div>
            {appeals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                <p className="text-sm text-zinc-600">Нет обращений по этому участку</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAppeals.map((appeal) => {
                  // Sprint 4.1: Используем функции из sla.ts для проверки dueSoon/overdue
                  const now = new Date();
                  const isOverdueAppeal = overdue(appeal.dueAt, now);
                  const isDueSoonAppeal = dueSoon(appeal.dueAt, now);

                  return (
                    <AppLink
                      key={appeal.id}
                      href={`/office/appeals/${appeal.id}`}
                      className={`block rounded-lg border px-4 py-3 transition hover:bg-zinc-50 ${
                        isOverdueAppeal ? "border-red-200 bg-red-50" :
                        isDueSoonAppeal ? "border-amber-200 bg-amber-50" :
                        "border-zinc-200 bg-white"
                      }`}
                      data-testid={`registry-appeal-${appeal.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-zinc-900">{appeal.title}</div>
                          {appeal.authorName && (
                            <div className="text-sm text-zinc-600">Автор: {appeal.authorName}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusClass[appeal.status]}`}>
                            {statusLabels[appeal.status]}
                          </span>
                          {/* Sprint 4.1: Бейджи dueSoon/overdue */}
                          {isOverdueAppeal && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800" data-testid="registry-appeal-overdue">
                              Просрочено
                            </span>
                          )}
                          {isDueSoonAppeal && !isOverdueAppeal && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800" data-testid="registry-appeal-duesoon">
                              Скоро срок
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-zinc-500">
                        Обновлено {new Date(appeal.updatedAt).toLocaleDateString("ru-RU")}
                        {appeal.dueAt && (
                          <span className="ml-2">
                            • Срок: {new Date(appeal.dueAt).toLocaleDateString("ru-RU")}
                          </span>
                        )}
                      </div>
                    </AppLink>
                  );
                })}
                {appeals.length > 10 && (
                  <AppLink
                    href={`/office/appeals?q=${encodeURIComponent(plot.plotNumber)}`}
                    className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Показать все обращения ({appeals.length})
                  </AppLink>
                )}
              </div>
            )}
          </section>

          {/* Sprint 4.1: Документы (заглушка) */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Документы</h2>
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
              <p className="text-sm text-zinc-600">Скоро</p>
            </div>
          </section>

          {/* Sprint 4.1: Заметки сотрудников (office notes) */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">
              Заметки сотрудников ({officeNotes.length})
            </h2>
            <PlotNotesClient plotId={id} initialNotes={officeNotes} />
            {/* TODO: Реализовать полноценную модель office notes */}
          </section>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Sprint 4.1: Финансы/Долги (только для admin/chairman/accountant) */}
          {canViewFinance && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="registry-finance">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900">Платежи/долги</h2>
              {financeData ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Долг</div>
                    <div className={`mt-1 text-lg font-semibold ${financeData.debt > 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {financeData.debt > 0 ? `${financeData.debt.toLocaleString("ru-RU")} ₽` : "Нет долга"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Начислено</div>
                    <div className="mt-1 text-zinc-700">{financeData.chargedTotal.toLocaleString("ru-RU")} ₽</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">Оплачено</div>
                    <div className="mt-1 text-zinc-700">{financeData.paidTotal.toLocaleString("ru-RU")} ₽</div>
                  </div>
                  <AppLink
                    href={`/office/finance?q=${encodeURIComponent(plot.plotNumber)}`}
                    className="mt-4 block rounded-lg border border-zinc-200 px-3 py-2 text-center text-sm font-semibold text-[#5E704F] hover:bg-zinc-50"
                  >
                    Открыть финансы →
                  </AppLink>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                  <p className="text-sm text-zinc-600">Нет финансовых данных</p>
                </div>
              )}
            </section>
          )}

          {/* Sprint 4.1: Журнал событий (ActivityLog) по участку и его обращениям */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="registry-activity">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Журнал событий</h2>
            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                <p className="text-sm text-zinc-600">Нет активности</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 10).map((activity) => (
                  <div key={activity.id} className="border-b border-zinc-100 pb-3 last:border-0" data-testid={`registry-activity-item-${activity.id}`}>
                    <div className="text-xs text-zinc-500">
                      {new Date(activity.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-1 text-sm text-zinc-900">
                      <span className="font-semibold">{activity.action}</span>
                      {activity.entityType !== "plot" && (
                        <span className="text-zinc-500"> ({activity.entityType})</span>
                      )}
                    </div>
                    {activity.actorRole && (
                      <div className="mt-1 text-xs text-zinc-500">
                        {activity.actorRole}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" data-testid="registry-audit">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">Аудит</h2>
            {auditLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                <p className="text-sm text-zinc-600">Нет событий аудита</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-b border-zinc-100 pb-3 last:border-0">
                    <div className="text-xs text-zinc-500">
                      {new Date(log.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="mt-1 text-sm text-zinc-900">
                      <span className="font-semibold">{log.action}</span>
                      {log.actorRole && <span className="text-zinc-500"> • {log.actorRole}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
