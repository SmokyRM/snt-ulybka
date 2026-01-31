import { redirect } from "next/navigation";
import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { listAppealsForResident } from "@/lib/appeals.store";

export const dynamic = "force-dynamic";

export default async function CabinetAppealsPage() {
  const session = await getEffectiveSessionUser();
  if (!session) {
    redirect("/login?next=/cabinet/appeals");
  }
  if (session.role !== "resident") {
    redirect("/forbidden");
  }
  type AppealItem = {
    id: string;
    createdAt: string;
    status: string;
    title?: string;
    message?: string;
    plotNumber?: string;
  };
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const residentAppeals = listAppealsForResident(session.id);
  const appeals: AppealItem[] = residentAppeals.length
    ? residentAppeals.map((appeal) => ({
        id: appeal.id,
        createdAt: appeal.createdAt,
        status: appeal.status,
        title: appeal.title,
        plotNumber: appeal.plotNumber,
      }))
    : (mock?.appeals ?? []).map((appeal) => ({
        id: appeal.id,
        createdAt: appeal.createdAt,
        status: appeal.status,
        message: appeal.message,
      }));
  const headerInfo = await getCabinetHeaderInfo("Обращения");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <CabinetHeader
          title="Обращения"
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />

        <CabinetCard title="Мои обращения" subtitle="Последние заявки" actionHref="/cabinet" actionLabel="На главную">
          {appeals.length === 0 ? (
            <EmptyState
              title="Обращений пока нет"
              description="Создайте обращение, чтобы получить ответ от правления."
              actionHref="/cabinet/appeals/new"
              actionLabel="Создать обращение"
            />
          ) : (
            <div className="space-y-2 text-sm text-zinc-800" data-testid="cabinet-appeals-list">
              {appeals.map((a) => (
                <a
                  key={a.id}
                  href={`/cabinet/appeals/${a.id}`}
                  data-testid={`cabinet-appeals-item-${a.id}`}
                  className="block rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 transition hover:border-[#5E704F] hover:bg-amber-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-zinc-900">{a.title ?? a.message ?? "Без темы"}</span>
                    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span>{a.plotNumber ?? "Участок не указан"}</span>
                    <span>{new Date(a.createdAt).toLocaleDateString("ru-RU")}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CabinetCard>
      </div>
    </main>
  );
}
