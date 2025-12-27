import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { getDebtsData, DebtTypeFilter } from "@/lib/debts";
import DebtsClient from "./DebtsClient";
import { logAdminAction } from "@/lib/audit";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

const today = new Date();
const defaultPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

export default async function DebtsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");
  const flags = await getFeatureFlags();
  const debtsV2On = isFeatureEnabled(flags, "debtsV2");
  const period = typeof searchParams?.period === "string" ? searchParams.period : defaultPeriod;
  const type = (typeof searchParams?.type === "string" ? searchParams.type : "all") as DebtTypeFilter;
  const minDebt =
    typeof searchParams?.minDebt === "string" && searchParams.minDebt.trim() !== ""
      ? Number(searchParams.minDebt)
      : null;
  const q = typeof searchParams?.q === "string" ? searchParams.q : "";
  const onlyUnnotified = searchParams?.onlyUnnotified === "1";

  const data = getDebtsData({ period, type, minDebt, q, onlyUnnotified });
  if (data.error) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm">
          <h1 className="text-2xl font-semibold">Долги</h1>
          <p className="mt-3">{data.error}</p>
          <Link href="/admin" className="text-[#5E704F] underline">
            Назад в админку
          </Link>
        </div>
      </main>
    );
  }

  await logAdminAction({
    action: "view_debts_dashboard",
    entity: "debts",
    after: { period, type, count: data.items.length },
  });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Долги по участкам</h1>
          {debtsV2On ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">V2 enabled</span>
          ) : null}
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Админка
          </Link>
        </div>
        <DebtsClient
          initialItems={data.items}
          totals={data.totals}
          filters={{ period, type, minDebt: minDebt ?? undefined, q, onlyUnnotified }}
        />
      </div>
    </main>
  );
}
