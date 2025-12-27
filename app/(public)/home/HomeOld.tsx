import Link from "next/link";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { PAYMENT_DETAILS } from "@/config/paymentDetails";
import { getContactsSetting } from "@/lib/settings.server";

const formatUrlLabel = (url: string) => url.replace(/^https?:\/\//, "");

export default async function HomeOld() {
  const contacts = getContactsSetting().value;
  const phone = contacts.phone || "—";
  const email = contacts.email || "—";
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
                  <a
                    href={OFFICIAL_CHANNELS.telegram}
                    className="text-[#5E704F] underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {formatUrlLabel(OFFICIAL_CHANNELS.telegram)}
                  </a>
                </div>
                <div>
                  VK:{" "}
                  <a
                    href={OFFICIAL_CHANNELS.vk}
                    className="text-[#5E704F] underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {formatUrlLabel(OFFICIAL_CHANNELS.vk)}
                  </a>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-base font-semibold text-zinc-900">Реквизиты для оплаты</div>
              <div className="mt-2 space-y-1 text-sm text-zinc-700">
                <div>Получатель: {PAYMENT_DETAILS.receiver}</div>
                <div>ИНН/КПП: {PAYMENT_DETAILS.inn} / {PAYMENT_DETAILS.kpp}</div>
                <div>Р/с: {PAYMENT_DETAILS.account}</div>
                <div>Банк: {PAYMENT_DETAILS.bank}</div>
                <div>БИК: {PAYMENT_DETAILS.bic}</div>
              </div>
            </div>
            <div id="get-access" className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-base font-semibold text-zinc-900">Как получить доступ</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700">
                <li>Найдите код доступа у правления</li>
                <li>Введите код на странице входа</li>
                <li>Заполните профиль и подтвердите участок</li>
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
            <div>
              <div className="font-semibold text-zinc-900">Как оплатить взносы?</div>
              <p>Реквизиты и назначения доступны в личном кабинете после входа.</p>
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Как передать показания?</div>
              <p>Передача показаний доступна в разделе «Электроэнергия» в кабинете.</p>
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Что делать новому собственнику?</div>
              <p>Заполните профиль и запросите код участка у правления.</p>
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Где найти документы?</div>
              <p>Официальные документы доступны в личном кабинете и в разделе «Документы».</p>
            </div>
            <div>
              <div className="font-semibold text-zinc-900">Как связаться с правлением?</div>
              <p>Контакты размещены в разделе «Контакты» и на странице «О портале».</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
