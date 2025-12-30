import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listTargetFundsWithStats } from "@/lib/targets";

const formatAmount = (n: number) => `${n.toFixed(2)} ₽`;

export default async function TargetsPage() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const funds = listTargetFundsWithStats(false);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Цели (целевые сборы)</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Админка
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-700">Всего целей: {funds.length}</div>
            <Link
              href="/admin/targets/new"
              className="rounded-full bg-[#5E704F] px-3 py-1 text-sm font-semibold text-white hover:bg-[#4f5f42]"
            >
              Создать цель
            </Link>
          </div>
          <div className="mt-4 overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Название</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Цель</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Собрано</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Расходы</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Прогресс</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Статус</th>
                  <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {funds.map((f) => (
                  <tr key={f.id}>
                    <td className="px-3 py-2 font-semibold">{f.title}</td>
                    <td className="px-3 py-2">{formatAmount(f.targetAmount)}</td>
                    <td className="px-3 py-2">{formatAmount(f.collected)}</td>
                    <td className="px-3 py-2">{formatAmount(f.spent)}</td>
                    <td className="px-3 py-2">
                      <div className="w-32 rounded-full bg-zinc-100">
                        <div
                          className="rounded-full bg-[#5E704F] text-xs text-white"
                          style={{ width: `${Math.min(f.progressPct, 100)}%` }}
                        >
                          &nbsp;
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600">{Math.min(f.progressPct, 100)}%</div>
                    </td>
                    <td className="px-3 py-2">{f.status}</td>
                    <td className="px-3 py-2">
                      <Link href={`/admin/targets/${f.id}`} className="text-[#5E704F] underline">
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
                {funds.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-center text-zinc-600" colSpan={7}>
                      Целей пока нет
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
