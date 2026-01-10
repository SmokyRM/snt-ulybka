import Link from "next/link";
import { getAllTemplates } from "@/lib/templates";

export const metadata = {
  title: "Шаблоны документов — СНТ «Улыбка»",
  alternates: { canonical: "/cabinet/templates" },
};

export default async function TemplatesPage() {
  const templates = await getAllTemplates();

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

        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((tpl) => (
            <Link
              key={tpl.slug}
              href={`/cabinet/templates/${tpl.slug}`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-[#5E704F]/50 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
                {tpl.category}
              </div>
              <h2 className="mt-2 text-lg font-semibold text-zinc-900">{tpl.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{tpl.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
