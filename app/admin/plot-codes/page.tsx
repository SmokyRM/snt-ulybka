import { redirect } from "next/navigation";
import { isAdmin, getSessionUser } from "@/lib/session.server";
import { generateInviteCode, getPlots, resetPlotOwner, verifyPlot, approvePlotProposal, rejectPlotProposal } from "@/lib/plots";

async function generate(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await generateInviteCode(plotId);
  }
  redirect("/admin/plot-codes");
}

async function resetOwner(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await resetPlotOwner(plotId);
  }
  redirect("/admin/plot-codes");
}

async function verify(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await verifyPlot(plotId);
  }
  redirect("/admin/plot-codes");
}

async function approveProposal(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await approvePlotProposal(plotId);
  }
  redirect("/admin/plot-codes");
}

async function rejectProposal(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await rejectPlotProposal(plotId);
  }
  redirect("/admin/plot-codes");
}

export default async function PlotCodesPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plots = await getPlots();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Коды участков и подтверждение</h1>
        <p className="text-sm text-zinc-600">Сгенерируйте код привязки, сбросьте привязку или подтвердите участок.</p>
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {plots.length === 0 ? (
            <p className="text-sm text-zinc-700">Участков пока нет.</p>
          ) : (
            plots.map((plot) => (
              <div key={plot.plotId} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-zinc-900">{plot.displayName || `№ ${plot.plotNumber}, ${plot.street}`}</div>
                  <div className="text-xs text-zinc-600">Кадастровый: {plot.cadastral || "—"}</div>
                  <div className="text-xs text-zinc-600">Владелец: {plot.ownerUserId || "не привязан"}</div>
                  <div className="text-xs text-zinc-600">Представитель: {plot.delegateUserId || "не назначен"}</div>
                  <div className="text-xs text-zinc-600">Статус: {plot.status || "DRAFT"}</div>
                  <div className="text-xs text-zinc-600">Код: {plot.inviteCode || "не сгенерирован"}</div>
                </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={generate}>
                      <input type="hidden" name="plotId" value={plot.plotId} />
                      <button
                        type="submit"
                        className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
                      >
                        Сгенерировать код
                      </button>
                    </form>
                    <form action={resetOwner}>
                      <input type="hidden" name="plotId" value={plot.plotId} />
                      <button
                        type="submit"
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-400"
                      >
                        Сбросить привязку
                      </button>
                    </form>
                    <form action={verify}>
                      <input type="hidden" name="plotId" value={plot.plotId} />
                      <button
                        type="submit"
                        className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300"
                      >
                        Подтвердить (VERIFIED)
                      </button>
                    </form>
                  </div>
                </div>
                {plot.proposedChanges ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <div className="font-semibold text-amber-900">Предложенные изменения</div>
                    <div>Улица: {plot.proposedChanges.street || plot.street}</div>
                    <div>Участок: {plot.proposedChanges.plotNumber || plot.plotNumber}</div>
                    <div>Кадастровый: {plot.proposedChanges.cadastral || plot.cadastral || "—"}</div>
                    <div className="mt-2 flex gap-2">
                      <form action={approveProposal}>
                        <input type="hidden" name="plotId" value={plot.plotId} />
                        <button
                          type="submit"
                          className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700 hover:border-emerald-300"
                        >
                          Утвердить
                        </button>
                      </form>
                      <form action={rejectProposal}>
                        <input type="hidden" name="plotId" value={plot.plotId} />
                        <button
                          type="submit"
                          className="rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-semibold text-red-700 hover:border-red-300"
                        >
                          Отклонить
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
