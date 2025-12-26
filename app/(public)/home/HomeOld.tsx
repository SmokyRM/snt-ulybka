import Link from "next/link";
import { telegramUrl, vkUrl } from "@/config/publicLinks";

const actions = [
  {
    title: "Электроэнергия",
    description: "Информация об оплате, передача показаний и ответы на вопросы.",
    href: "/electricity",
  },
  {
    title: "Взносы",
    description: "Формула расчёта, ставки, реквизиты и шаблон назначения платежа.",
    href: "/fees",
  },
  {
    title: "Документы",
    description: "Устав, протоколы и решения размещаются в этом разделе.",
    href: "/docs",
  },
  {
    title: "Контакты",
    description: "Связь с правлением и официальные каналы СНТ «Улыбка».",
    href: "/contacts",
  },
];

export default function HomeOld() {
  return (
    <main className="space-y-12 bg-[#F8F1E9] pb-16 pt-8 sm:space-y-16 sm:pb-20 sm:pt-12">
      <section className="pt-4">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl border border-[#5E704F]/15 bg-white/80 px-6 py-12 shadow-sm sm:px-10">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#5E704F]">Официальный портал СНТ</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
              СНТ «Улыбка» — официальный сайт
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700">
              СНТ «Улыбка» — садоводческое некоммерческое товарищество. Здесь публикуется официальная информация:
              электроэнергия, взносы, документы и контакты правления. Личный кабинет и админка доступны после входа.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
              >
                Войти в кабинет
              </Link>
              <Link
                href="/contacts"
                className="rounded-full border border-[#5E704F] px-6 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
              >
                Контакты правления
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-2">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-zinc-900">Что можно сделать на сайте</h2>
            <span className="text-sm text-zinc-600">Публичные разделы</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-2xl border border-zinc-200/70 bg-white/90 p-5 text-sm shadow-sm transition-colors hover:border-[#5E704F]/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-zinc-900">{item.title}</h3>
                  <span className="text-lg text-[#5E704F] transition-transform group-hover:translate-x-1">→</span>
                </div>
                <p className="mt-2 text-sm text-zinc-700">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="pay" className="py-2">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">Оплата и реквизиты</h2>
            <p className="mt-2 text-sm text-zinc-700">
              В разделах ниже собраны инструкции по оплате электроэнергии и взносов, реквизиты и ответы на вопросы.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/electricity"
                className="rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
              >
                Электроэнергия
              </Link>
              <Link
                href="/fees"
                className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
              >
                Взносы
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="news" className="py-2">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">Новости</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Официальные объявления и информация публикуются в новостях сайта и официальных каналах СНТ.
            </p>
          </div>
        </div>
      </section>

      <section id="docs" className="py-2">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">Документы</h2>
            <p className="mt-2 text-sm text-zinc-700">Устав, протоколы и решения товарищества размещаются в разделе документов.</p>
            <Link
              href="/docs"
              className="mt-3 inline-flex rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Перейти к документам
            </Link>
          </div>
        </div>
      </section>

      <section id="appeal" className="py-2">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-зinc-900">Обращения</h2>
            <p className="mt-2 text-sm text-zinc-700">
              Форма обращений будет добавлена позже. Пока связаться с правлением можно через раздел контактов.
            </p>
            <Link
              href="/contacts"
              className="mt-3 inline-flex rounded-full border border-зinc-300 px-4 py-2 text-xs font-semibold text-зinc-700 transition-colors hover:border-зinc-400"
            >
              Перейти к контактам
            </Link>
          </div>
        </div>
      </section>

      <section id="contacts" className="py-2">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-зinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-зinc-900">Официальные каналы</h2>
            <p className="mt-2 text-sm text-зinc-700">Следите за обновлениями СНТ «Улыбка» в официальных сообществах.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href={vkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-зinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
              >
                VK: vk.com/snt_smile
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-зinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition-colors hover:border-[#5E704F]/50"
              >
                Telegram: t.me/snt_smile
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
