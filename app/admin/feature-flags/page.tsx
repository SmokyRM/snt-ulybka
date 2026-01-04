import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { FeatureFlagKey, getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import { toggleFeatureFlag } from "./actions";

const labels: Record<FeatureFlagKey, string> = {
  newPublicHome: "Новая публичная главная",
  debtsV2: "Долги v2",
  cabinetMvp: "Кабинет MVP",
  forceNewHome: "Сделать новую главную основной",
  ai_widget_enabled: "Помощник (виджет на сайте)",
  ai_personal_enabled: "ИИ: доступ к личным данным",
};

export const dynamic = "force-dynamic";

export default async function FeatureFlagsPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const flags = await getFeatureFlags();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Feature flags</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Админка
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="divide-y divide-zinc-100">
            {(Object.keys(labels) as FeatureFlagKey[]).map((key) => {
              const enabled = isFeatureEnabled(flags, key);
              return (
                <form key={key} action={toggleFeatureFlag} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{labels[key]}</div>
                    <div className="text-xs text-zinc-600">{key}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="hidden" name="key" value={key} />
                    <input type="hidden" name="value" value={enabled ? "off" : "on"} />
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        enabled ? "bg-[#5E704F] text-white" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {enabled ? "ON" : "OFF"}
                    </span>
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100"
                    >
                      {enabled ? "Выключить" : "Включить"}
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
