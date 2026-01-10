import KnowledgeIndex from "@/components/knowledge/KnowledgeIndex";
import { getAllArticles } from "@/lib/knowledge";

export const metadata = {
  title: "База знаний — СНТ «Улыбка»",
  description: "Ответы на частые вопросы и краткие инструкции по порталу.",
  alternates: {
    canonical: "/knowledge",
  },
};

export default async function KnowledgePage() {
  const articles = await getAllArticles();
  const categories = Array.from(
    new Set(articles.map((item) => item.category)),
  );

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            База знаний
          </p>
          <h1 className="text-3xl font-semibold">Ответы на частые вопросы</h1>
          <p className="text-sm text-zinc-700">
            Короткие инструкции по доступу, оплатам, электроэнергии и документам.
          </p>
        </header>

        <KnowledgeIndex articles={articles} categories={categories} />
      </div>
    </main>
  );
}
