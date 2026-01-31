import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { readOk } from "@/lib/api/client";

type HealthResponse = {
  ok: boolean;
  serverTimeIso: string;
  serverTimeLocalFormatted: string;
  uptimeSeconds: number;
  buildInfo: {
    commitHash: string | null;
    branch: string | null;
    buildTime: string | null;
  };
  db: { ok: boolean; latencyMs?: number; error?: string };
  session: { ok: boolean };
  jobs: {
    running: number;
    failedLast24h: number;
    failedItems: Array<{
      id: string;
      type: string;
      error: string | null;
      attempts: number;
      updatedAt: string;
    }>;
  };
  lastUpdates: {
    requisitesUpdatedAt?: string | null;
    socialLinksUpdatedAt?: string | null;
  };
  recentErrors: Array<{
    id: string;
    source: string;
    key: string;
    message: string;
    route?: string | null;
    createdAt: string;
    requestId?: string | null;
  }>;
  storage: {
    users: number;
    plots: number;
    payments: number;
    appeals: number;
    auditLogs: number;
    auditLogEntries: number;
    officeJobs: number;
    loginAudit: number;
    errorEvents: number;
  };
};

const fetchHealth = async (): Promise<HealthResponse | null> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/health`, {
      cache: "no-store",
    });
    return await readOk<HealthResponse>(res);
  } catch {
    return null;
  }
};

export default async function AdminHealthPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/staff/login?next=/admin");
  }
  const health = await fetchHealth();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6" data-testid="admin-health-root">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Состояние системы</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/health"
              className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Обновить
            </Link>
            <Link
              href="/admin"
              className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
            >
              Назад
            </Link>
          </div>
        </div>

        {!health && (
          <div className="rounded-2xl border border-red-200 bg-white p-5 text-red-700 shadow-sm">
            Не удалось получить данные здоровья.
          </div>
        )}

        {health && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Server
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                {health.ok ? "OK" : "Проблема"}
              </h2>
              <p className="text-sm text-zinc-700">Время: {health.serverTimeLocalFormatted}</p>
              <p className="text-sm text-zinc-700">Uptime: {health.uptimeSeconds}s</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">DB</p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                {health.db.ok ? "OK" : "Проблема"}
              </h2>
              <p className="text-sm text-zinc-700">latency: {health.db.latencyMs ?? "—"} ms</p>
              {health.db.error && <p className="text-sm text-red-700">{health.db.error}</p>}
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Session
              </p>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                {health.session.ok ? "OK" : "Проблема"}
              </h2>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Build
              </p>
              <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
                <div>Commit: {health.buildInfo.commitHash ?? "—"}</div>
                <div>Branch: {health.buildInfo.branch ?? "—"}</div>
                <div>Build: {health.buildInfo.buildTime ?? "—"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Последние обновления
              </p>
              <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
                <div>
                  Реквизиты:{" "}
                  {health.lastUpdates.requisitesUpdatedAt
                    ? health.lastUpdates.requisitesUpdatedAt
                    : "—"}
                </div>
                <div>
                  Каналы:{" "}
                  {health.lastUpdates.socialLinksUpdatedAt
                    ? health.lastUpdates.socialLinksUpdatedAt
                    : "—"}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">Jobs</p>
              <div className="mt-2 text-sm text-zinc-700">
                В работе: {health.jobs.running}
              </div>
              <div className="text-sm text-zinc-700">Ошибок за 24ч: {health.jobs.failedLast24h}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Storage
              </p>
              <div className="mt-2 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
                <div>Пользователи: {health.storage.users}</div>
                <div>Участки: {health.storage.plots}</div>
                <div>Платежи: {health.storage.payments}</div>
                <div>Обращения: {health.storage.appeals}</div>
                <div>Audit logs: {health.storage.auditLogs}</div>
                <div>Audit entries: {health.storage.auditLogEntries}</div>
                <div>Jobs: {health.storage.officeJobs}</div>
                <div>Login audit: {health.storage.loginAudit}</div>
                <div>Error events: {health.storage.errorEvents}</div>
              </div>
            </div>

            <div
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-3"
              data-testid="admin-health-jobs-failed"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Ошибки заданий (24ч)
              </p>
              {health.jobs.failedItems.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">Нет ошибок заданий.</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                  {health.jobs.failedItems.map((job) => (
                    <div key={job.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <div className="text-xs text-zinc-500">{job.type}</div>
                      <div className="font-medium text-zinc-900">{job.id}</div>
                      <div className="text-xs text-rose-700">{job.error ?? "Ошибка"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-3"
              data-testid="admin-health-errors-list"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                Последние ошибки
              </p>
              {health.recentErrors.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600">Ошибок не найдено.</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                  {health.recentErrors.map((event) => (
                    <div key={event.id} className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                        <span>{event.source}</span>
                        <span>{new Date(event.createdAt).toLocaleString("ru-RU")}</span>
                      </div>
                      <div className="font-medium text-zinc-900">{event.message}</div>
                      {event.route ? <div className="text-xs text-zinc-500">{event.route}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
