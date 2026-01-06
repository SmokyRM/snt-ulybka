import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getAiUsageDashboard } from "@/lib/aiUsageStore";
import { getFeatureFlags } from "@/lib/featureFlags";
import { getAiSettings } from "@/lib/aiSettings";
import AiSettingsToggle from "./AiSettingsToggle";

export default async function AdminAiUsagePage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string; role?: string; outOfScope?: string }>;
}) {
  // Manual checks:
  // - Period/role/out-of-scope filters update summary and recent table.
  // - Top paths/topics reflect recent traffic.
  // - Out-of-scope rate and avg latency show sane values.
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    redirect("/login?next=/admin");
  }

  const params = (await searchParams) ?? {};
  const days = params.days === "30" ? 30 : 7;
  const roleFilter = params.role ?? "all";
  const outOfScopeOnly = params.outOfScope === "1";
  const dashboard = await getAiUsageDashboard({
    days,
    role: roleFilter === "all" ? null : roleFilter,
    outOfScopeOnly,
  });
  const flags = await getFeatureFlags();
  const aiSettings = await getAiSettings();
  const roles = ["all", "guest", "user", "admin", "board", "accountant", "operator"];
  const buildQuery = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = {
      days: String(days),
      role: roleFilter,
      outOfScope: outOfScopeOnly ? "1" : "0",
      ...patch,
    };
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") return;
      params.set(key, value);
    });
    return params.toString() ? `?${params.toString()}` : "";
  };

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

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Настройки ИИ</h2>
          <AiSettingsToggle flags={flags} settings={aiSettings} />
        </section>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span className="font-semibold">Период:</span>
              <Link
                href={`/admin/ai-usage${buildQuery({ days: "7" })}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  days === 7
                    ? "border-[#5E704F] text-[#5E704F]"
                    : "border-zinc-200 text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                }`}
              >
                7 дней
              </Link>
              <Link
                href={`/admin/ai-usage${buildQuery({ days: "30" })}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  days === 30
                    ? "border-[#5E704F] text-[#5E704F]"
                    : "border-zinc-200 text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                }`}
              >
                30 дней
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <span className="font-semibold">Роль:</span>
              {roles.map((role) => (
                <Link
                  key={role}
                  href={`/admin/ai-usage${buildQuery({ role })}`}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    roleFilter === role
                      ? "border-[#5E704F] text-[#5E704F]"
                      : "border-zinc-200 text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                  }`}
                >
                  {role === "all" ? "Все" : role}
                </Link>
              ))}
              <Link
                href={`/admin/ai-usage${buildQuery({ outOfScope: outOfScopeOnly ? "0" : "1" })}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  outOfScopeOnly
                    ? "border-[#5E704F] text-[#5E704F]"
                    : "border-zinc-200 text-zinc-600 hover:border-[#5E704F] hover:text-[#5E704F]"
                }`}
              >
                Только off-scope
              </Link>
            </div>
          </div>
        </div>

        {!dashboard || !dashboard.hasData ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm">
            Статистика появится после первых запросов.
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Сводка</h2>
              <div className="mt-3 grid gap-3 text-sm text-zinc-700 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Всего запросов</div>
                  <div className="text-base font-semibold text-zinc-900">
                    {dashboard.totalRequests}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Out-of-scope</div>
                  <div className="text-base font-semibold text-zinc-900">
                    {Math.round(dashboard.outOfScopeRate * 100)}%
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Средняя задержка</div>
                  <div className="text-base font-semibold text-zinc-900">
                    {dashboard.avgLatencyMs ? `${dashboard.avgLatencyMs} ms` : "—"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Топ путей и тем</h2>
              <div className="mt-3 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-zinc-500">Top paths</div>
                  <div className="mt-2 space-y-2">
                    {dashboard.topPaths.length === 0 ? (
                      <div className="text-xs text-zinc-500">Нет данных.</div>
                    ) : (
                      dashboard.topPaths.map((item) => (
                        <div
                          key={item.pathHint}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="text-xs text-zinc-500">{item.pathHint || "unknown"}</div>
                          <div className="text-sm font-semibold text-zinc-900">{item.count}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Top topics</div>
                  <div className="mt-2 space-y-2">
                    {dashboard.topTopics.length === 0 ? (
                      <div className="text-xs text-zinc-500">Нет данных.</div>
                    ) : (
                      dashboard.topTopics.map((item) => (
                        <div
                          key={item.topic}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                        >
                          <div className="text-xs text-zinc-500">{item.topic || "unknown"}</div>
                          <div className="text-sm font-semibold text-zinc-900">{item.count}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900">Топ пользователей (период)</h2>
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
              <h2 className="text-lg font-semibold text-zinc-900">По ролям (период)</h2>
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
                <div className="mt-3 overflow-auto">
                  <table className="min-w-full text-xs text-zinc-700">
                    <thead className="text-left uppercase tracking-wide text-zinc-400">
                      <tr>
                        <th className="py-2 pr-3">ts</th>
                        <th className="py-2 pr-3">role</th>
                        <th className="py-2 pr-3">path</th>
                        <th className="py-2 pr-3">topic</th>
                        <th className="py-2 pr-3">mode</th>
                        <th className="py-2 pr-3">outScope</th>
                        <th className="py-2 pr-3">latency</th>
                        <th className="py-2 pr-3">cached</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {dashboard.recentEvents.map((event, index) => (
                        <tr key={`${event.ts}-${index}`}>
                          <td className="py-2 pr-3 text-zinc-500">{event.ts}</td>
                          <td className="py-2 pr-3">{event.role}</td>
                          <td className="py-2 pr-3">{event.pathHint ?? "—"}</td>
                          <td className="py-2 pr-3">{event.topic ?? "—"}</td>
                          <td className="py-2 pr-3">{event.mode ?? "—"}</td>
                          <td className="py-2 pr-3">{event.outOfScope ? "yes" : "no"}</td>
                          <td className="py-2 pr-3">
                            {typeof event.latencyMs === "number" ? `${event.latencyMs} ms` : "—"}
                          </td>
                          <td className="py-2 pr-3">{event.cached ? "yes" : "no"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
