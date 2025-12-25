import { execSync } from "node:child_process";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_FEATURE_COOKIE,
  getFeatureFlags,
  isAdminNewUIEnabled,
  setFeatureFlag,
} from "@/lib/featureFlags";
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

async function toggleFeature(formData: FormData) {
  "use server";
  const enable = formData.get("feature") === "on";
  const store = await Promise.resolve(cookies());
  await setFeatureFlag("ADMIN_FEATURE_NEW_UI", enable, store);
  revalidatePath("/admin/build-info");
}

export default async function AdminBuildInfoPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    redirect("/login");
  }
  const cookieStore = await Promise.resolve(cookies());
  const commitSha = getCommitSha();
  const branch = getBranch();
  const vercelEnv = process.env.VERCEL_ENV || "unknown";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || "unknown";
  const serverTime = new Date().toISOString();
  const featureFromEnv = process.env.ADMIN_FEATURE_NEW_UI === "1" || process.env.ADMIN_FEATURE_NEW_UI === "true";
  const featureCookie = cookieStore.get(ADMIN_FEATURE_COOKIE)?.value === "1";
  const featureFlags = await getFeatureFlags(cookieStore);
  const featureEffective = featureFlags.ADMIN_FEATURE_NEW_UI;

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Новый UI (feature-flag)</p>
              <p className="text-xs text-zinc-600">
                Итог: env={String(featureFromEnv)} + cookie={String(featureCookie)} →{" "}
                {featureEffective ? "ON" : "OFF"}
              </p>
            </div>
            {(await isAdminNewUIEnabled(cookieStore)) && (
              <span className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
                Включено
              </span>
            )}
          </div>

          <form action={toggleFeature} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                name="feature"
                defaultChecked={featureCookie}
                className="h-4 w-4 rounded border-zinc-300 text-[#5E704F] focus:ring-[#5E704F]"
              />
              Сохранять флаг в cookie (30 дней)
            </label>
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f5f42]"
            >
              Сохранить
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
