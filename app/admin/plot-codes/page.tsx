import { redirect } from "next/navigation";
import { isAdmin, getSessionUser } from "@/lib/session.server";
import {
  generateInviteCode,
  getPlots,
  resetPlotOwner,
  verifyPlot,
  approvePlotProposal,
  rejectPlotProposal,
  clearInviteCode,
} from "@/lib/plots";
import ConfirmActionForm from "./ConfirmActionForm";

async function generate(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    const code = await generateInviteCode(plotId, user?.id ?? null);
    if (code) {
      redirect(`/admin/plot-codes?code=${encodeURIComponent(code)}&plot=${encodeURIComponent(plotId)}`);
    }
  }
  redirect("/admin/plot-codes");
}

async function resetOwner(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await resetPlotOwner(plotId, user?.id ?? null);
    redirect(`/admin/plot-codes?success=owner_reset&plot=${encodeURIComponent(plotId)}`);
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

async function clearCode(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plotId = (formData.get("plotId") as string | null) ?? "";
  if (plotId) {
    await clearInviteCode(plotId, user?.id ?? null);
    redirect(`/admin/plot-codes?success=code_reset&plot=${encodeURIComponent(plotId)}`);
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

export default async function PlotCodesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login");
  const plots = await getPlots();
  const code = typeof searchParams?.code === "string" ? searchParams.code : null;
  const plotParam = typeof searchParams?.plot === "string" ? searchParams.plot : null;
  const success = typeof searchParams?.success === "string" ? searchParams.success : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Коды участков и подтверждение</h1>
        <p className="text-sm text-zinc-600">Сгенерируйте код привязки, сбросьте привязку или подтвердите участок.</p>
        {success === "code_reset" && plotParam ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Код сброшен для участка: {plotParam}.
          </div>
        ) : null}
        {success === "owner_reset" && plotParam ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Привязка владельца сброшена для участка: {plotParam}.
          </div>
        ) : null}
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {plots.length === 0 ? (
            <p className="text-sm text-zinc-700">Участков пока нет.</p>
          ) : (
            plots.map((plot) => (
              <div key={plot.plotId} className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="font-semibold text-zinc-900">{plot.displayName || `№ ${plot.plotNumber}, ${plot.street}`}</div>
                    <div className="text-xs text-zinc-600">Кадастровый: {plot.cadastral || "—"}</div>
                    <div className="text-xs text-zinc-600">Владелец: {plot.ownerUserId || "не привязан"}</div>
                    <div className="text-xs text-zinc-600">Представитель: {plot.delegateUserId || "не назначен"}</div>
                    <div className="text-xs text-zinc-600">
                      Статус:{" "}
                      <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold">
                        {plot.status || "DRAFT"}
                      </span>
                    </div>
                    {plotParam === plot.plotId && code ? (
                      <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                        Код: {code}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!plot.ownerUserId ? (
                      <>
                        <form action={generate}>
                          <input type="hidden" name="plotId" value={plot.plotId} />
                          <button
                            type="submit"
                            className="rounded-full border border-[#5E704F] px-3 py-1 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
                          >
                            {plot.inviteCodeHash ? "Показать новый код" : "Сгенерировать код"}
                          </button>
                        </form>
                        {plot.inviteCodeHash ? (
                          <ConfirmActionForm
                            action={clearCode}
                            plotId={plot.plotId}
                            confirmText="Сбросить код? Старый код перестанет работать."
                            buttonClassName="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-100"
                          >
                            Сбросить код
                          </ConfirmActionForm>
                        ) : null}
                      </>
                    ) : (
                      <span className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700">Привязан</span>
                    )}
                    <ConfirmActionForm
                      action={resetOwner}
                      plotId={plot.plotId}
                      confirmText="Снять владельца? Доступ владельца будет отключён. Потребуется новый код."
                      buttonClassName="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-400"
                    >
                      Сбросить привязку
                    </ConfirmActionForm>
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
