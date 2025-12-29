import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listPlotsWithFilters } from "@/lib/mockDb";

type PlotStatus = "DRAFT" | "INVITE_READY" | "CLAIMED" | "VERIFIED";

const statusOrder: PlotStatus[] = ["DRAFT", "INVITE_READY", "CLAIMED", "VERIFIED"];

const normalizeStatus = (value?: string | null): PlotStatus => {
  if (value === "DRAFT" || value === "INVITE_READY" || value === "CLAIMED" || value === "VERIFIED") {
    return value;
  }
  return "DRAFT";
};

const buildDisplay = (plot: { street: string; plotNumber: string }) => `${plot.street}, участок ${plot.plotNumber}`;

export default async function RegistryAnalyticsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");

  const { items } = listPlotsWithFilters({ page: 1, pageSize: 10000 });

  const byStatus = items.reduce(
    (acc, plot) => {
      const status = normalizeStatus(plot.status);
      acc[status] += 1;
      return acc;
    },
    { DRAFT: 0, INVITE_READY: 0, CLAIMED: 0, VERIFIED: 0 } as Record<PlotStatus, number>
  );

  const withoutCadastral = items.filter((p) => !p.cadastral).length;
  const withoutPhone = items.filter((p) => !p.phone).length;

  const problemPlots = items
    .filter((p) => ["DRAFT", "INVITE_READY"].includes(normalizeStatus(p.status)))
    .slice(0, 20);

  const pendingVerification = items.filter((p) => normalizeStatus(p.status) === "CLAIMED").slice(0, 20);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Проблемы и сводка</h1>
            <p className="text-sm text-zinc-600">Сводка по статусам и проблемным участкам.</p>
          </div>
          <Link
            href="/admin/registry"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            К реестру
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Всего участков</div>
            <div className="text-2xl font-semibold">{items.length}</div>
          </div>
          {statusOrder.map((status) => (
            <div key={status} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-zinc-500">Статус {status}</div>
              <div className="text-2xl font-semibold">{byStatus[status]}</div>
              <Link
                href={`/admin/registry?status=${status}`}
                className="mt-2 inline-block text-xs font-semibold text-[#5E704F] underline"
              >
                Открыть реестр с фильтром
              </Link>
            </div>
          ))}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Без кадастрового номера</div>
            <div className="text-2xl font-semibold">{withoutCadastral}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Без телефона владельца</div>
            <div className="text-2xl font-semibold">{withoutPhone}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Problem plots (DRAFT / INVITE_READY)</h2>
            <Link
              href="/admin/registry?status=DRAFT"
              className="text-xs font-semibold text-[#5E704F] underline"
            >
              Открыть реестр с фильтром
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Кадастр</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Владелец</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {problemPlots.map((plot) => (
                  <tr key={plot.id}>
                    <td className="px-3 py-2">
                      <Link href={`/admin/registry/${plot.id}`} className="text-[#5E704F] underline">
                        {buildDisplay(plot)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{plot.cadastral || "—"}</td>
                    <td className="px-3 py-2">{plot.ownerFullName || "—"}</td>
                    <td className="px-3 py-2">{normalizeStatus(plot.status)}</td>
                  </tr>
                ))}
                {problemPlots.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={4}>
                      Нет проблемных участков
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending verification (CLAIMED)</h2>
            <Link
              href="/admin/registry?status=CLAIMED"
              className="text-xs font-semibold text-[#5E704F] underline"
            >
              Открыть реестр с фильтром
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Участок</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Кадастр</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Владелец</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {pendingVerification.map((plot) => (
                  <tr key={plot.id}>
                    <td className="px-3 py-2">
                      <Link href={`/admin/registry/${plot.id}`} className="text-[#5E704F] underline">
                        {buildDisplay(plot)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{plot.cadastral || "—"}</td>
                    <td className="px-3 py-2">{plot.ownerFullName || "—"}</td>
                    <td className="px-3 py-2">{normalizeStatus(plot.status)}</td>
                  </tr>
                ))}
                {pendingVerification.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={4}>
                      Нет участков в статусе CLAIMED
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
