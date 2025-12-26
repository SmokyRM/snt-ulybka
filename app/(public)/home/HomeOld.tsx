import Link from "next/link";

export default function HomeOld() {
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#5E704F]">СНТ «Улыбка»</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            Личный кабинет СНТ «Улыбка»
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700">
            Официальный портал для собственников участков. Взносы, электроэнергия, документы и обращения — в одном
            месте.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти в личный кабинет
            </Link>
          </div>
          <p className="mt-2 text-xs text-zinc-600">Доступ предоставляется собственникам участков СНТ.</p>

          <div className="mt-6 space-y-4 text-sm text-zinc-800">
            <div>
              <div className="text-base font-semibold text-zinc-900">Что доступно после входа</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Учёт взносов и начислений</li>
                <li>Электроэнергия: показания, начисления, история</li>
                <li>Официальные документы СНТ</li>
                <li>Уведомления о важных событиях</li>
                <li>Обращения в правление с историей</li>
              </ul>
              <p className="mt-2 text-xs text-zinc-600">Весь функционал доступен только после входа.</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-base font-semibold text-zinc-900">Официально и безопасно</div>
              <p className="text-sm text-zinc-700">
                Это официальный сайт СНТ «Улыбка». Данные используются только для работы товарищества и не передаются
                третьим лицам.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>Доступ по коду</li>
                <li>Официальные данные</li>
                <li>Привязка к участку</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800">
              <div className="font-semibold text-zinc-900">Почему теперь так</div>
              <p className="mt-2">
                Мы собрали все сервисы в личном кабинете, чтобы упростить работу с СНТ и быстро получать официальные
                данные.
              </p>
            </div>

            <div className="text-sm font-semibold text-zinc-800">Уже подключились: 143 участка</div>
          </div>
        </div>
      </section>
    </main>
  );
}
