import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getAiUsageDashboard } from "@/lib/aiUsageStore";
import { getFeatureFlags, isFeatureEnabled, isFeatureFlagsWritable } from "@/lib/featureFlags";
import AiSettingsToggle from "./AiSettingsToggle";

export default async function AdminAiUsagePage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin");
  }

  const dashboard = await getAiUsageDashboard();
  const flags = await getFeatureFlags();
  const aiEnabled = isFeatureEnabled(flags, "ai_assistant_enabled");
  const canWrite = isFeatureFlagsWritable();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Использование ИИ</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>

        <AiSettingsToggle enabled={aiEnabled} canWrite={canWrite} />

        {!dashboard || !dashboard.hasData ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm">
            Нет данных.
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Топ пользователей (сегодня)</h2>
              {dashboard.topUsers.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600">Нет данных.</div>
              ) : (
                <div className="mt-3 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="py-2 pr-4">User</th>
                        <th className="py-2 pr-4">Запросы</th>
                        <th className="py-2">Токены</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {dashboard.topUsers.map((item) => (
                        <tr key={item.userId}>
                          <td className="py-2 pr-4 font-semibold text-zinc-900">{item.userId}</td>
                          <td className="py-2 pr-4">{item.count}</td>
                          <td className="py-2">{item.tokens || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">По ролям (сегодня)</h2>
              {dashboard.roleCounts.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600">Нет данных.</div>
              ) : (
                <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
                  {dashboard.roleCounts.map((item) => (
                    <div key={item.role} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <div className="text-xs text-zinc-500">{item.role}</div>
                      <div className="text-base font-semibold text-zinc-900">{item.count}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Последние события</h2>
              {dashboard.recentEvents.length === 0 ? (
                <div className="mt-2 text-sm text-zinc-600">Нет данных.</div>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-zinc-700">
                  {dashboard.recentEvents.map((event, index) => (
                    <div key={`${event.ts}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                        <span>{event.ts}</span>
                        <span>user: {event.userId}</span>
                        <span>role: {event.role}</span>
                        <span>source: {event.source}</span>
                        <span>cached: {event.cached ? "yes" : "no"}</span>
                        <span>{event.success ? "ok" : "error"}</span>
                      </div>
                      {!event.success && event.error ? (
                        <div className="mt-1 text-xs text-rose-700">Ошибка: {event.error}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
