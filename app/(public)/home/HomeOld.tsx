import Link from "next/link";
import FaqAccordion from "@/components/home/FaqAccordion";
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
  const phoneHref = phone !== "—" ? `tel:${phone.replace(/[^+\d]/g, "")}` : "";
  const emailHref = email !== "—" ? `mailto:${email}` : "";
  const contactHref = telegram || emailHref || "";
  const faqItems = content.faq.length > 0 ? content.faq.slice(0, 5) : [];
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-5xl space-y-12 px-4 sm:space-y-[72px] sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            Личный кабинет жителей СНТ «Улыбка»
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700">
            Участок, взносы и электроэнергия — всё в одном месте.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-full bg-[#5E704F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
            >
              Войти
            </Link>
          </div>
          <Link
            href="#get-access"
            className="mt-3 inline-block text-sm font-semibold text-[#5E704F] underline"
          >
            Впервые? → Как получить доступ
          </Link>
        </div>

        <section className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Зачем нужна регистрация</h2>
            <p className="mt-1 text-xs text-zinc-600">
              Чтобы все данные по участку были под рукой — без звонков и бумажек.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <div className="text-2xl">🏡</div>
                <div className="mt-2 font-semibold text-zinc-900">Мой участок</div>
                <p className="mt-1 text-xs text-zinc-600">
                  Статус собственности и данные по участку.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <div className="text-2xl">💰</div>
                <div className="mt-2 font-semibold text-zinc-900">История оплат</div>
                <p className="mt-1 text-xs text-zinc-600">
                  Взносы, начисления и платежи.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <div className="text-2xl">⚡</div>
                <div className="mt-2 font-semibold text-zinc-900">Показания счётчика</div>
                <p className="mt-1 text-xs text-zinc-600">
                  Электроэнергия и передача показаний.
                </p>
              </div>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-zinc-600">
              <li>Меньше ошибок и недоразумений с начислениями.</li>
            </ul>
          </div>
          <div
            id="get-access"
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-zinc-900">Как получить доступ</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
              <li>Нажмите «Войти» и укажите email или телефон.</li>
              <li>Укажите участок (пример: «Берёзовая, 12» или кадастровый номер).</li>
              <li>Прикрепите документ, если попросим (выписка/договор).</li>
              <li>Правление проверит заявку за 1–2 дня — после этого откроется доступ.</li>
            </ol>
            <p className="mt-3 text-xs text-zinc-600">
              Нет кода или не знаете номер участка?{" "}
              {contactHref ? (
                <a
                  href={contactHref}
                  className="text-[#5E704F] underline"
                  target={telegram ? "_blank" : undefined}
                  rel={telegram ? "noreferrer" : undefined}
                >
                  Напишите в правление
                </a>
              ) : (
                "Напишите в правление."
              )}
            </p>
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
              <div>
                Телефон:{" "}
                {phone !== "—" ? (
                  <a href={phoneHref} className="text-[#5E704F] underline">
                    {phone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div>
                Почта:{" "}
                {email !== "—" ? (
                  <a href={emailHref} className="text-[#5E704F] underline">
                    {email}
                  </a>
                ) : (
                  "—"
                )}
              </div>
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
          <FaqAccordion items={faqItems} />
        </section>
        <div className="text-xs text-zinc-500">
          ✨ Сайт улучшается — делаем его проще и понятнее для жителей СНТ.
        </div>
      </section>
    </main>
  );
}
