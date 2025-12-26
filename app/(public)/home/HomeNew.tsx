import Link from "next/link";
import { telegramUrl, vkUrl } from "@/config/publicLinks";

const tiles = [
  { title: "Новости", desc: "Официальные объявления правления", href: "/#news" },
  { title: "Документы", desc: "Устав, протоколы и решения", href: "/docs" },
  { title: "Электроэнергия", desc: "Оплата, калькулятор и FAQ", href: "/electricity" },
  { title: "Взносы", desc: "Формула, реквизиты и долги", href: "/fees" },
  { title: "Обращения", desc: "Создать обращение в кабинет", href: "/login" },
  { title: "Контакты", desc: "Правление и каналы связи", href: "/contacts" },
];

export default function HomeNew() {
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#5E704F]">СНТ «Улыбка»</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            Официальный сайт товарищества
          </h1>
          <p className="mt-4 max-w-3xl text-base text-zinc-700">
            Здесь публикуются документы, новости, оплата электроэнергии и взносов. Личный кабинет доступен после входа и
            подтверждения данных.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти
            </Link>
            <Link
              href="/contacts"
              className="rounded-full border border-[#5E704F] px-6 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
            >
              Контакты
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-zinc-900">Разделы</h2>
          <span className="text-sm text-zinc-600">Публично и без авторизации</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#5E704F]/60"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">{t.title}</h3>
                <span className="text-[#5E704F] transition-transform group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-2 text-sm text-zinc-700">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 w/full max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Личный кабинет члена СНТ</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>Долги и начисления по вашему участку</li>
            <li>Передача показаний и история оплат</li>
            <li>Обращения в правление и ответы</li>
            <li>Важные документы и уведомления</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-600">Доступно после подтверждения членства.</p>
          <Link
            href="/login"
            className="mt-3 inline-flex rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
          >
            Войти в кабинет
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Официальные каналы</h2>
          <p className="mt-2 text-sm text-zinc-700">Следите за обновлениями СНТ «Улыбка» в официальных сообществах.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a
              href={vkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition hover:border-[#5E704F]/50"
            >
              VK: vk.com/snt_smile
            </a>
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-[#5E704F] transition hover:border-[#5E704F]/50"
            >
              Telegram: t.me/snt_smile
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
