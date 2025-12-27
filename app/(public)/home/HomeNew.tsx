import Link from "next/link";
import type { PublicContent } from "@/lib/publicContentDefaults";

const formatUrlLabel = (url: string) => url.replace(/^https?:\/\//, "");

type HomeNewProps = {
  content: PublicContent;
};

export default function HomeNew({ content }: HomeNewProps) {
  const phone = content.contacts.phone || "—";
  const email = content.contacts.email || "—";
  const telegram = content.contacts.telegram;
  const vk = content.contacts.vk;
  return (
    <main className="bg-[#F8F1E9] pb-16 pt-10 sm:pt-14">
      <section className="mx-auto w-full max-w-5xl space-y-10 px-4 sm:px-6">
        <div className="rounded-3xl border border-[#5E704F]/20 bg-white/90 p-6 shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold leading-tight text-zinc-900 sm:text-4xl">
            СНТ «Улыбка» — официальный портал
          </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-700">
            Доступ к данным по участку, взносам и электроэнергии — после подтверждения членства.
          </p>
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
        </div>

        <section className="space-y-6">
          <div className="grid gap-4 text-sm text-zinc-800 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-base font-semibold text-zinc-900">Контакты правления</div>
              <div className="mt-2 space-y-1 text-sm text-zinc-700">
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-base font-semibold text-zinc-900">Реквизиты для оплаты</div>
              <div className="mt-2 space-y-1 text-sm text-zinc-700">
                <div>Получатель: {content.paymentDetails.receiver}</div>
                <div>
                  ИНН/КПП: {content.paymentDetails.inn} / {content.paymentDetails.kpp}
                </div>
                <div>Р/с: {content.paymentDetails.account}</div>
                <div>Банк: {content.paymentDetails.bank}</div>
                <div>БИК: {content.paymentDetails.bic}</div>
              </div>
            </div>
            <div id="get-access" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-base font-semibold text-zinc-900">Как получить доступ</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
                {content.accessSteps.map((step, index) => (
                  <li key={`${step}-${index}`}>{step}</li>
                ))}
              </ol>
              <Link href="/login" className="mt-3 inline-block text-xs font-semibold text-[#5E704F] underline">
                Перейти ко входу
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Частые вопросы</h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
            {content.faq.map((item, index) => (
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
