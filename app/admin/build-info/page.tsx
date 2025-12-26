import { execSync } from "node:child_process";
import { redirect } from "next/navigation";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import { getSessionUser, isAdmin } from "@/lib/session.server";

const safeCapture = (cmd: string): string | null => {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
};

const getCommitSha = (): string =>
  process.env.VERCEL_GIT_COMMIT_SHA || safeCapture("git rev-parse HEAD") || "unknown";

const getBranch = (): string =>
  process.env.VERCEL_GIT_COMMIT_REF || safeCapture("git rev-parse --abbrev-ref HEAD") || "unknown";

export default async function AdminBuildInfoPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }
  const commitSha = getCommitSha();
  const branch = getBranch();
  const vercelEnv = process.env.VERCEL_ENV || "unknown";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || "unknown";
  const serverTime = new Date().toISOString();
  const featureFlags = await getFeatureFlags();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Информация о сборке</h1>
          <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
            Только для админов
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <dl className="space-y-3 text-sm sm:text-base">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-semibold text-zinc-700">Commit SHA</dt>
              <dd className="font-mono text-zinc-900">{commitSha}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-semibold text-zinc-700">Branch</dt>
              <dd className="font-mono text-zinc-900">{branch}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-semibold text-zinc-700">Vercel Env</dt>
              <dd className="font-mono text-zinc-900">{vercelEnv}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-semibold text-zinc-700">Vercel Deployment ID</dt>
              <dd className="font-mono text-zinc-900">{deploymentId}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <dt className="font-semibold text-zinc-700">Server time</dt>
              <dd className="font-mono text-zinc-900">{serverTime}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Feature flags (read-only)</h2>
          <ul className="space-y-2 text-sm text-zinc-800">
            {Object.entries(featureFlags).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded border border-zinc-100 bg-zinc-50 px-3 py-2">
                <span>{k}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${v ? "bg-[#5E704F] text-white" : "bg-zinc-200 text-zinc-700"}`}>
                  {isFeatureEnabled(featureFlags, k as keyof typeof featureFlags) ? "ON" : "OFF"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-600">
            Управление флагами: <a href="/admin/feature-flags" className="text-[#5E704F] underline">/admin/feature-flags</a>
          </p>
        </div>
      </div>
    </main>
  );
}
