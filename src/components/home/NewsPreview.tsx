const newsItems = [
  {
    date: "12 марта 2024",
    title: "Плановые работы на линии электроснабжения",
    excerpt: "Временные отключения возможны в дневные часы.",
  },
  {
    date: "02 марта 2024",
    title: "Собрание членов товарищества",
    excerpt: "Повестка и материалы будут размещены дополнительно.",
  },
  {
    date: "20 февраля 2024",
    title: "Подготовка территории к весеннему сезону",
    excerpt: "Просим убрать участки и обеспечить доступ к общим зонам.",
  },
];

export default function NewsPreview() {
  return (
    <section id="news" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Новости</h2>
          <span className="text-sm text-zinc-600">Последние объявления</span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {newsItems.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
                {item.date}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-zinc-900">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {item.excerpt}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
