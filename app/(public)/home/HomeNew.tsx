import Link from "next/link";
import type { PublicContent } from "@/lib/publicContentDefaults";
import { siteCity, siteName, siteTitleFull } from "@/config/site";

const formatUrlLabel = (url: string) => url.replace(/^https?:\/\//, "");

type HomeNewProps = {
  content: PublicContent;
};

export default function HomeNew({ content }: HomeNewProps) {
  const phone = content.contacts.phone || "—";
  const email = content.contacts.email || "—";
  const telegram = content.contacts.telegram;
  const vk = content.contacts.vk;
  const contactLine = siteCity;
  const faqItems = content.faq.slice(0, 5);
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-5xl space-y-10 px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            {siteName} — официальный сайт
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700">
            Официальный портал {siteTitleFull}. Доступ к данным по участку, взносам и электроэнергии
            открывается после подтверждения членства.
          </p>
          <p className="mt-3 text-sm text-zinc-600">
            Официальный сайт {siteName} находится в стадии развития. Разделы и функциональность
            добавляются поэтапно.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти в личный кабинет
            </Link>
            <Link
              href="/access"
              className="rounded-full border border-[#5E704F] px-6 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F] hover:text-white"
            >
              Как получить доступ
            </Link>
          </div>
          <div className="mt-3 text-xs text-zinc-600">
            Если у вас нет кода участка — отправьте запрос в правление из кабинета.
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Что даёт регистрация</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-3">
            <div>Доступ к участку и статусам собственности в {siteCity}.</div>
            <div>Взносы и начисления с историей оплат.</div>
            <div>Электроэнергия: показания, уведомления, история.</div>
          </div>
        </section>

        <section id="get-access" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Как получить доступ</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            {content.accessSteps.map((step, index) => (
              <li key={`${step}-${index}`}>{step}</li>
            ))}
          </ol>
          <div className="mt-3 text-xs text-zinc-600">
            Все функции доступны только после входа.
          </div>
          <Link href="/access" className="mt-3 inline-block text-xs font-semibold text-[#5E704F] underline">
            Подробнее о доступе
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Контакты правления</h2>
          <div className="mt-3 text-sm text-zinc-700">
            <div>{siteTitleFull}</div>
            <div className="mt-1">Регион: {siteCity}</div>
            <div className="mt-1">Территория товарищества: {contactLine}</div>
          </div>
          <div className="mt-4 grid gap-1 text-sm text-zinc-700 sm:grid-cols-2">
            <div>Телефон: {phone}</div>
            <div>Почта: {email}</div>
            <div>
              Telegram:{" "}
              {telegram ? (
                <a
                  href={telegram}
                  className="text-[#5E704F] underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatUrlLabel(telegram)}
                </a>
              ) : (
                "—"
              )}
            </div>
            <div>
              VK:{" "}
              {vk ? (
                <a
                  href={vk}
                  className="text-[#5E704F] underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {formatUrlLabel(vk)}
                </a>
              ) : (
                "—"
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Частые вопросы</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
            {faqItems.map((item, index) => (
              <div key={`${item.question}-${index}`}>
                <div className="font-semibold text-zinc-900">{item.question}</div>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
