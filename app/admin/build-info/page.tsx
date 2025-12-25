import { execSync } from "node:child_process";

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

export default function AdminBuildInfoPage() {
  const commitSha = getCommitSha();
  const branch = getBranch();
  const vercelEnv = process.env.VERCEL_ENV || "unknown";
  const serverTime = new Date().toISOString();

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
              <dt className="font-semibold text-zinc-700">Server time</dt>
              <dd className="font-mono text-zinc-900">{serverTime}</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}

