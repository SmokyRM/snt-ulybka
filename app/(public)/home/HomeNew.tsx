import Link from "next/link";

export default function HomeNew() {
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#5E704F]">СНТ «Улыбка»</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            Официальный портал СНТ «Улыбка»
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700">
            Доступ к данным по участку, взносам и электроэнергии — после подтверждения членства.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти в кабинет
            </Link>
            <Link
              href="/access"
              className="rounded-full border border-[#5E704F] px-6 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F] hover:text-white"
            >
              Как получить доступ
            </Link>
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Если у вас нет кода участка — отправьте запрос в правление из кабинета.
          </p>
        </div>

        <div className="mt-8 grid gap-4 text-sm text-zinc-800 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Что даёт регистрация</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Доступ к участку и статусам</li>
              <li>Начисления/взносы и история</li>
              <li>Электроэнергия, показания и уведомления</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Как получить доступ</div>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Войдите в кабинет и заполните профиль</li>
              <li>Введите код участка (если он есть)</li>
              <li>Если кода нет — запросите его в правление</li>
              <li>После подтверждения членства откроется доступ</li>
            </ol>
            <Link href="/access" className="mt-3 inline-block text-xs font-semibold text-[#5E704F] underline">
              Подробнее
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Частые вопросы</div>
            <div className="mt-2 space-y-2 text-xs text-zinc-700">
              <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <summary className="cursor-pointer font-semibold text-zinc-900">Зачем нужна регистрация?</summary>
                <p className="mt-1">
                  Чтобы привязать участок и открыть доступ к данным и сервисам СНТ.
                </p>
              </details>
              <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <summary className="cursor-pointer font-semibold text-zinc-900">Где взять код участка?</summary>
                <p className="mt-1">Код выдаёт правление. Если кода нет — запросите его в кабинете.</p>
              </details>
              <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <summary className="cursor-pointer font-semibold text-zinc-900">
                  Что делать, если участок уже привязан?
                </summary>
                <p className="mt-1">
                  Обратитесь в правление: возможно участок привязан прежним собственником.
                </p>
              </details>
              <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <summary className="cursor-pointer font-semibold text-zinc-900">
                  Когда откроется полный доступ?
                </summary>
                <p className="mt-1">После подтверждения членства/прав владения правлением.</p>
              </details>
              <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <summary className="cursor-pointer font-semibold text-zinc-900">
                  Как связаться с правлением?
                </summary>
                <p className="mt-1">
                  Контакты указаны в разделе{" "}
                  <Link href="/contacts" className="text-[#5E704F] underline">
                    Контакты
                  </Link>{" "}
                  и на странице «О портале».
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
