import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { enableBetaHome, disableBetaHome } from "./actions";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

export default async function BetaHomePage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
          <h1 className="text-xl font-semibold">Доступ только для администратора</h1>
          <p className="mt-2 text-sm">Для управления бетой авторизуйтесь как админ.</p>
          <Link href="/login" className="mt-3 inline-flex text-[#5E704F] underline">
            На страницу входа
          </Link>
        </div>
      </main>
    );
  }

  const flags = await getFeatureFlags();
  const flagOn = isFeatureEnabled(flags, "newPublicHome");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Бета главной (newPublicHome)</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Админка
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
          <p className="text-sm text-zinc-800">
            Флаг newPublicHome: <strong>{flagOn ? "ON" : "OFF"}</strong>. Если флаг выключен, бета недоступна.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <form action={enableBetaHome}>
              <button
                type="submit"
                className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
                disabled={!flagOn}
              >
                Enable beta home on this device
              </button>
            </form>
            <form action={disableBetaHome}>
              <button
                type="submit"
                className="rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F]/10"
              >
                Disable beta home on this device
              </button>
            </form>
          </div>
          {!flagOn && (
            <p className="text-xs text-amber-700">
              Включите флаг newPublicHome через /admin/feature-flags, чтобы бета была доступна.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
