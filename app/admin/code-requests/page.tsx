import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listCodeRequests, resolveCodeRequest } from "@/lib/codeRequests";
import { getPlots, generateInviteCode } from "@/lib/plots";
import CodeRequestsClient from "./CodeRequestsClient";

async function resolveAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const id = (formData.get("id") as string | null) ?? "";
  const plotId = (formData.get("plotId") as string | null) ?? "";
  const comment = (formData.get("adminComment") as string | null) ?? "";
  if (!id) redirect("/admin/code-requests");
  if (plotId) {
    await generateInviteCode(plotId, user?.id ?? null);
  }
  await resolveCodeRequest({ id, adminComment: comment || null, plotId: plotId || null, actorUserId: user?.id ?? null });
  const params = new URLSearchParams();
  if (plotId) params.set("code_for", plotId);
  params.set("resolved", "1");
  redirect(`/admin/code-requests?${params.toString()}`);
}

export default async function CodeRequestsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const requests = await listCodeRequests();
  const plots = await getPlots();
  const resolvedPlot = typeof searchParams?.code_for === "string" ? searchParams.code_for : null;
  const resolvedFlag = typeof searchParams?.resolved === "string";

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
        {resolvedFlag && !resolvedPlot ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Запрос закрыт.
          </div>
        ) : null}
        <CodeRequestsClient requests={requests} plots={plots} onResolve={resolveAction} />
      </div>
    </main>
  );
}
