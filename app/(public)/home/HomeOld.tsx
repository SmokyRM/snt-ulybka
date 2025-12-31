import Link from "next/link";
import type { PublicContent } from "@/lib/publicContentDefaults";
import { siteCity, siteName } from "@/config/site";

const formatUrlLabel = (url: string) => url.replace(/^https?:\/\//, "");

type HomeOldProps = {
  content: PublicContent;
};

export default function HomeOld({ content }: HomeOldProps) {
  const phone = content.contacts.phone || "—";
  const email = content.contacts.email || "—";
  const telegram = content.contacts.telegram;
  const vk = content.contacts.vk;
  const faqItems = content.faq.length > 0 ? content.faq.slice(0, 5) : [];
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-5xl space-y-10 px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            СНТ «Улыбка» — официальный сайт
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700">
            Официальный сайт {siteName} ({siteCity}). Доступ к данным по участку, взносам и
            электроэнергии открывается после подтверждения членства.
          </p>
          <div className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
            Официальный сайт {siteName} находится в стадии разработки. Разделы и функциональность
            добавляются поэтапно.
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти в личный кабинет
            </Link>
            <Link
              href="#get-access"
              className="rounded-full border border-[#5E704F] px-6 py-2.5 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F] hover:text-white"
            >
              Как получить доступ
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            Если у вас нет кода участка, запросите его у правления {siteCity}.
          </p>
        </div>

        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Что даёт регистрация</h2>
            <ul className="mt-3 grid gap-3 text-sm text-zinc-700 sm:grid-cols-3">
              <li>Доступ к участку и статусам собственности.</li>
              <li>Начисления, взносы и история оплат.</li>
              <li>Электроэнергия: показания, уведомления и напоминания.</li>
            </ul>
          </div>
          <div
            id="get-access"
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-zinc-900">Как получить доступ</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              <li>Войдите в кабинет и заполните профиль.</li>
              <li>Введите код участка, если он уже у вас есть.</li>
              <li>Если кода нет — запросите его у правления.</li>
              <li>После подтверждения членства откроется полный доступ.</li>
            </ol>
            <Link
              href="/access"
              className="mt-3 inline-block text-xs font-semibold text-[#5E704F] underline"
            >
              Подробнее о доступе
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Контакты правления</h2>
            <p className="mt-2 text-sm text-zinc-700">
              {siteName}, {siteCity}. По вопросам регистрации и доступа обращайтесь в правление.
            </p>
            <div className="mt-3 space-y-1 text-sm text-zinc-700">
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
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Частые вопросы</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
            {faqItems.length > 0 ? (
              faqItems.map((item, index) => (
                <div key={`${item.question}-${index}`}>
                  <div className="font-semibold text-zinc-900">{item.question}</div>
                  <p>{item.answer}</p>
                </div>
              ))
            ) : (
              <>
                <div>
                  <div className="font-semibold text-zinc-900">Зачем нужна регистрация?</div>
                  <p>Чтобы привязать участок и открыть доступ к данным СНТ.</p>
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">Где взять код участка?</div>
                  <p>Код выдаёт правление. Если кода нет — запросите его в кабинете.</p>
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">Когда откроется доступ?</div>
                  <p>После подтверждения членства и данных по участку.</p>
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">Как связаться с правлением?</div>
                  <p>Контакты указаны на странице «Контакты» и в этом разделе.</p>
                </div>
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
