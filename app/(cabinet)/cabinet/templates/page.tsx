import Link from "next/link";
import TemplateListClient from "./TemplateListClient";
import { buildTemplateContext, fillTemplate, getAllTemplates } from "@/lib/templates";
import { getSessionUser } from "@/lib/session.server";
import { getUserPlots } from "@/lib/plots";
import { getUserProfile } from "@/lib/userProfiles";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Шаблоны документов — СНТ «Улыбка»",
  alternates: { canonical: "/cabinet/templates" },
};

export default async function TemplatesPage() {
  const session = await getSessionUser();
  if (!session || !session.id) {
    redirect("/login?next=/cabinet/templates");
  }
  const templates = await getAllTemplates();
  const [profile, plots] = await Promise.all([
    getUserProfile(session.id ?? ""),
    getUserPlots(session.id ?? ""),
  ]);
  const ctx = buildTemplateContext(
    profile,
    plots.map((p) => ({
      plotId: p.plotId,
      plotNumber: p.plotNumber,
      displayName: p.displayName ?? p.plotNumber ?? undefined,
      cadastral: "cadastral" in p ? (p as { cadastral?: string | null }).cadastral ?? null : null,
    })),
  );
  const templateCards = templates.map((tpl) => ({
    slug: tpl.slug,
    title: tpl.title,
    description: tpl.description ?? tpl.summary,
    tags: tpl.tags ?? [],
    filledText: fillTemplate(tpl.content, ctx),
  }));

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            Шаблоны
          </p>
          <h1 className="text-2xl font-semibold">Готовые тексты для обращений</h1>
          <p className="text-sm text-zinc-700">
            Заполните шаблон данными профиля, скопируйте или скачайте PDF.
          </p>
        </header>

        {templates.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Шаблонов пока нет</div>
            <p className="text-sm text-zinc-700">
              Мы подготовим готовые тексты для обращений. Если нужно срочно — напишите в правление.
            </p>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <Link href="/cabinet/appeals/new" className="rounded-full bg-[#5E704F] px-4 py-2 text-white">
                Создать обращение
              </Link>
              <Link
                href="/cabinet"
                className="rounded-full border border-zinc-200 px-4 py-2 text-[#5E704F] hover:border-[#5E704F]"
              >
                В кабинет
              </Link>
            </div>
          </div>
        ) : (
          <TemplateListClient templates={templateCards} />
        )}
      </div>
    </main>
  );
}
