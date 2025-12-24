const links = [
  { label: "Электроэнергия", href: "#power" },
  { label: "Взносы", href: "#fees" },
  { label: "Оплата и реквизиты", href: "#pay" },
  { label: "Новости", href: "#news" },
  { label: "Документы", href: "#docs" },
  { label: "Обращение в правление", href: "#appeal" },
];

export default function QuickLinks() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-6">
          <h2 className="text-2xl font-semibold text-zinc-900">
            Быстрые ссылки
          </h2>
          <span className="text-sm text-zinc-600">
            Часто используемые разделы
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-zinc-200/70 bg-white/90 p-5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:border-[#5E704F]/50 hover:text-[#5E704F]"
            >
              <div className="flex items-center justify-between">
                <span>{link.label}</span>
                <span className="text-lg text-[#5E704F] transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
