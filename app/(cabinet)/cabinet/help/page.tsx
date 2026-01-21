import Link from "next/link";
import { readQaCabinetMockEnabled } from "@/lib/qaCabinetStage.server";
import type { QaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { getQaCabinetMockData } from "../../../cabinet/_dev/qaMockData";
import { CabinetCard } from "../../../cabinet/_components/CabinetCard";
import { EmptyState } from "../../../cabinet/_components/EmptyState";
import { getCabinetHeaderInfo } from "../../../cabinet/_components/headerInfo";
import { CabinetHeader } from "../../../cabinet/_components/CabinetHeader";

export const dynamic = "force-dynamic";

export default async function CabinetHelpPage() {
  const mockEnabled = await readQaCabinetMockEnabled();
  const mock = mockEnabled ? getQaCabinetMockData() : null;
  const announcements: QaCabinetMockData["announcements"] = mock?.announcements ?? [];
  const headerInfo = await getCabinetHeaderInfo("Помощь");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <CabinetHeader
          title="Помощь"
          statusLine={headerInfo.statusLine}
          progressLabel={headerInfo.progressLabel}
          progressHref={headerInfo.progressHref}
        />

        <CabinetCard title="Быстрые ссылки" subtitle="Документы и контакты" actionHref="/contacts" actionLabel="Контакты">
          <ul className="space-y-2 text-sm text-zinc-800">
            <li>
              <a href="/cabinet/docs" className="text-[#5E704F] underline">
                Документы
              </a>
            </li>
            <li>
              <Link href="/cabinet/appeals" className="text-[#5E704F] underline">
                Создать обращение
              </Link>
            </li>
            <li>
              <a href="/security" className="text-[#5E704F] underline">
                Безопасность
              </a>
            </li>
          </ul>
        </CabinetCard>

        <CabinetCard title="Последние объявления" subtitle="Новости">
          {announcements.length === 0 ? (
            <EmptyState title="Объявлений нет" description="Будут опубликованы позже." />
          ) : (
            <div className="space-y-2 text-sm text-zinc-800">
              {announcements.map((a) => (
                <div key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(a.publishedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </CabinetCard>
      </div>
    </main>
  );
}
