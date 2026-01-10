import Link from "next/link";
import { notFound } from "next/navigation";
import TemplateCopy from "./TemplateCopy";
import { getTemplateBySlug, renderTemplate } from "@/lib/templates";

type Params = { params: { slug: string } };

export const metadata = {
  title: "Шаблон документа — СНТ «Улыбка»",
};

export default async function TemplatePage({ params }: Params) {
  const template = await getTemplateBySlug(params.slug);
  if (!template) notFound();
  const rendered = renderTemplate(template.content);

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-xs text-zinc-500">
          <Link href="/templates" className="hover:text-[#5E704F] hover:underline">
            Шаблоны
          </Link>{" "}
          → {template.title}
        </div>
        <header className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#5E704F]">
            {template.category}
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{template.title}</h1>
          <p className="text-sm text-zinc-600">{template.summary}</p>
          <div className="text-xs text-zinc-500">
            Обновлено: {new Date(template.updatedAt).toLocaleDateString("ru-RU")}
          </div>
        </header>

        <TemplateCopy text={rendered} />
      </div>
    </main>
  );
}
