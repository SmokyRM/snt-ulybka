import Link from "next/link";
import { cookies } from "next/headers";
import { listAuditLogs } from "@/lib/mockDb";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return (
      <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          <h1 className="text-2xl font-semibold">Доступ запрещён</h1>
          <p className="text-sm text-zinc-700">Эта страница доступна только администраторам.</p>
          <Link href="/login" className="text-[#5E704F] underline">
            Войти
          </Link>
        </div>
      </main>
    );
  }
  await Promise.resolve(cookies());
  const actionFilter = typeof params.action === "string" ? params.action.trim() : "";
  const logs = listAuditLogs({ limit: 200, action: actionFilter || null });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Audit log</h1>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад в админку
          </Link>
        </div>

        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-zinc-600" htmlFor="action">
              Фильтр по действию
            </label>
            <input
              id="action"
              name="action"
              placeholder="Например: import_payments_csv"
              defaultValue={actionFilter}
              className="w-72 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white" type="submit">
            Применить
          </button>
          {actionFilter && (
            <Link className="text-sm text-[#5E704F] underline" href="/admin/audit">
              Сбросить
            </Link>
          )}
        </form>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Дата</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Действие</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Сущность</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">Актор</th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-700">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-3 py-2 text-zinc-700">{new Date(log.createdAt).toLocaleString("ru-RU")}</td>
                  <td className="px-3 py-2 text-zinc-900">{log.action}</td>
                  <td className="px-3 py-2 text-zinc-700">
                    {log.entity}
                    {log.entityId ? ` (${log.entityId})` : ""}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {log.actorRole ?? "—"} {log.actorUserId ? `(${log.actorUserId})` : ""}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">{log.ip ?? "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-zinc-600" colSpan={5}>
                    Записей пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
