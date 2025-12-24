export default function Payments() {
  return (
    <section id="pay" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Оплата</h2>
          <span className="text-sm text-zinc-600">
            Основные способы оплаты
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <article
            id="fees"
            className="scroll-mt-24 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-zinc-900">
              Оплата взносов
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>Членские взносы</li>
              <li>Целевые взносы</li>
              <li>Назначение платежа</li>
            </ul>
            <a
              href="#contacts"
              className="mt-6 inline-flex rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Реквизиты
            </a>
          </article>
          <article
            id="power"
            className="scroll-mt-24 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-zinc-900">
              Оплата электроэнергии
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-zinc-700">
              <li>Тариф товарищества</li>
              <li>Передача показаний</li>
              <li>Оплата по квитанции</li>
            </ul>
            <a
              href="#contacts"
              className="mt-6 inline-flex rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Как оплатить
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
