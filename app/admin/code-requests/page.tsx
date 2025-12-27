import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { listCodeRequests, resolveCodeRequest } from "@/lib/codeRequests";
import { getPlots, generateInviteCode } from "@/lib/plots";

async function resolveAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const id = (formData.get("id") as string | null) ?? "";
  const plotId = (formData.get("plotId") as string | null) ?? "";
  const comment = (formData.get("adminComment") as string | null) ?? "";
  if (!id) redirect("/admin/code-requests");
  if (plotId) {
    await generateInviteCode(plotId, user?.id ?? null);
  }
  await resolveCodeRequest({ id, adminComment: comment || null, plotId: plotId || null, actorUserId: user?.id ?? null });
  redirect(`/admin/code-requests${plotId ? `?code_for=${encodeURIComponent(plotId)}` : ""}`);
}

export default async function CodeRequestsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const requests = await listCodeRequests();
  const plots = await getPlots();
  const resolvedPlot = typeof searchParams?.code_for === "string" ? searchParams.code_for : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Запросы на код участка</h1>
            <p className="text-sm text-zinc-600">Пользователи без кода могут отправить запрос.</p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Назад
          </Link>
        </div>
        {resolvedPlot ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Код сгенерирован для участка: {resolvedPlot}. Проверьте страницу кодов.
          </div>
        ) : null}
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">Запросов пока нет.</div>
        ) : (
          <div className="space-y-3">
            {requests
              .slice()
              .reverse()
              .map((req) => (
                <div key={req.id} className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-zinc-900">{req.plotDisplay}</div>
                      <div className="text-xs text-zinc-600">Кадастровый: {req.cadastralNumber || "—"}</div>
                      <div className="text-xs text-zinc-600">Комментарий: {req.comment || "—"}</div>
                      <div className="text-xs text-zinc-600">Статус: {req.status}</div>
                      {req.resolvedBy ? <div className="text-xs text-zinc-600">Закрыл: {req.resolvedBy}</div> : null}
                      <div className="text-xs text-zinc-600">
                        Создано: {new Date(req.createdAt).toLocaleString("ru-RU")}
                        {req.resolvedAt ? ` • Закрыто: ${new Date(req.resolvedAt).toLocaleString("ru-RU")}` : ""}
                      </div>
                    </div>
                    {req.status === "NEW" ? (
                      <form action={resolveAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <input type="hidden" name="id" value={req.id} />
                        <label className="text-xs font-semibold text-zinc-700">
                          Участок
                          <select name="plotId" className="mt-1 rounded border border-zinc-300 px-2 py-1 text-sm" defaultValue="">
                            <option value="">Не выбрано</option>
                            {plots.map((p) => (
                              <option key={p.plotId} value={p.plotId}>
                                {p.displayName || `${p.street} ${p.plotNumber}`}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-zinc-700">
                          Комментарий
                          <input
                            name="adminComment"
                            className="mt-1 w-48 rounded border border-zinc-300 px-2 py-1 text-sm"
                            placeholder="Комментарий"
                          />
                        </label>
                        <button
                          type="submit"
                          className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d41]"
                        >
                          Сгенерировать код и закрыть
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">
                        Завершено
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
