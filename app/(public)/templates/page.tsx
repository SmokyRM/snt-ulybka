import TemplatesIndex from "@/components/templates/TemplatesIndex";
import { getAllTemplates } from "@/lib/templates";

export const metadata = {
  title: "Шаблоны документов — СНТ «Улыбка»",
  description: "Готовые тексты обращений и запросов с плейсхолдерами.",
  alternates: { canonical: "/templates" },
};

export default async function TemplatesPage() {
  const templates = await getAllTemplates();
  const categories = Array.from(new Set(templates.map((tpl) => tpl.category)));
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            Шаблоны
          </p>
          <h1 className="text-3xl font-semibold">Документы и обращения</h1>
          <p className="text-sm text-zinc-700">
            Выберите шаблон, скопируйте текст и подставьте свои данные.
          </p>
        </header>

        <TemplatesIndex templates={templates} categories={categories} />
      </div>
    </main>
  );
}
