export default function Hero() {
  return (
    <section className="pt-10 sm:pt-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/15 bg-white/80 px-6 py-12 shadow-sm sm:px-10">
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#5E704F]">
              Официальный портал товарищества
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
              СНТ «Улыбка» — официальный сайт
            </h1>
            <p className="text-base leading-7 text-zinc-700">
              Официальная информация, объявления и документы для членов СНТ.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#pay"
                className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
              >
                Оплата
              </a>
              <a
                href="#docs"
                className="rounded-full border border-[#5E704F] px-6 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
              >
                Документы
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
