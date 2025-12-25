const items = [
  {
    title: "Электроэнергия",
    description: "Передача показаний и оплата по тарифу товарищества.",
    subtitle: "Калькулятор оплаты и FAQ",
    href: "/electricity",
    actionLabel: "Открыть калькулятор",
  },
  {
    title: "Взносы",
    description: "Членские и целевые взносы: порядок оплаты и назначение платежа.",
  },
  {
    title: "Объявления",
    description: "Официальные новости, работы на территории и собрания.",
  },
];

export default function Important() {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-6">
          <h2 className="text-2xl font-semibold text-zinc-900">
            Сейчас важно
          </h2>
          <span className="text-sm text-zinc-600">
            Ключевые задачи товарищества
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="mt-1 text-xs font-medium text-[#5E704F]">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                {item.href && (
                  <a
                    href={item.href}
                    className="text-sm font-semibold text-[#5E704F] transition-colors hover:text-[#4d5d41]"
                  >
                    →
                  </a>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                {item.description}
              </p>
              {item.href && item.actionLabel && (
                <div className="mt-4">
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
                  >
                    {item.actionLabel}
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
