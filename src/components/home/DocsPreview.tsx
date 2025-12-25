const docs = [
  "Устав",
  "Реквизиты",
  "Протоколы",
  "Тарифы и порядок оплаты",
];

export default function DocsPreview() {
  return (
    <section id="docs" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Документы</h2>
          <span className="text-sm text-zinc-600">
            Основные файлы и положения
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {docs.map((doc) => (
            <a
              key={doc}
              href="#docs"
              className="rounded-2xl border border-zinc-200/70 bg-white/90 p-5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:border-[#5E704F]/50 hover:text-[#5E704F]"
            >
              {doc}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
