import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

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
  lastUpdates: {
    requisitesUpdatedAt?: string | null;
    socialLinksUpdatedAt?: string | null;
  };
  recentErrors: unknown[];
};

const fetchHealth = async (): Promise<HealthResponse | null> => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/admin/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
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
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
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
          </div>
        )}
      </div>
    </main>
  );
}
