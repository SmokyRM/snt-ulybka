import CopyToClipboard from "@/components/CopyToClipboard";
import FeesCalculator from "@/components/FeesCalculator";
import FaqSearch from "@/components/FaqSearch";
import { FEES_FAQ } from "@/content/fees";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { getSntSettings } from "@/lib/sntSettings";
import Link from "next/link";

export const metadata = {
  title: "Взносы и долги — СНТ «Улыбка»",
  description:
    "Порядок оплаты, формула расчёта, сроки и ответы на частые вопросы.",
};

export default function FeesPage() {
  const settings = getSntSettings();
  const {
    membershipFeeRubPerYear,
    targetFeeRubPerYear,
    feesPaymentDeadlineDay,
    bankRequisitesText,
  } = settings.value;
  const paymentTemplate =
    "СНТ Улыбка; улица <...>; участок <...>; период <...>; площадь <...> сот.; взносы";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            Взносы и долги
          </p>
          <h1 className="text-3xl font-semibold">Взносы СНТ</h1>
          <p className="text-sm text-zinc-700">
            Информация о текущих размерах взносов, сроках оплаты и порядке перечисления.
          </p>
          <ul className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
            <li>• Текущие размеры взносов</li>
            <li>• Оплата по реквизитам СНТ</li>
            <li>• Сроки и порядок сверки</li>
          </ul>
        </header>

        <section className="rounded-3xl border border-[#5E704F]/20 bg-[#5E704F]/10 p-6 text-sm text-zinc-900 shadow-sm">
          <h2 className="text-lg font-semibold text-[#2F3827]">Ключевое правило</h2>
          <p className="mt-2 text-sm text-zinc-800">
            Членские и целевые взносы обязательны для всех собственников участков. Статус “член/не
            член” не влияет на обязанность оплаты.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Какие взносы</h2>
          <p className="mt-3 text-sm text-zinc-700">
            Текущие размеры взносов определяются решениями общего собрания. Ниже указаны значения,
            действующие в СНТ.
          </p>
          <div className="mt-4 grid gap-4 text-sm text-zinc-700 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase text-zinc-500">Членские</div>
              <div className="text-base font-semibold text-zinc-900">
                {membershipFeeRubPerYear} ₽ / сотка в год
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="text-xs uppercase text-zinc-500">Целевые</div>
              <div className="text-base font-semibold text-zinc-900">
                {targetFeeRubPerYear ? `${targetFeeRubPerYear} ₽ / сотка в год` : "Нет данных"}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <FeesCalculator rateRubPerSotka={membershipFeeRubPerYear} />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Как оплатить</h2>
          <p className="mt-3 text-sm text-zinc-700">
            Укажите в назначении платежа данные участка и период. Рекомендуемый срок оплаты — до{" "}
            {feesPaymentDeadlineDay} числа.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-zinc-800">Реквизиты</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800">
                {bankRequisitesText}
              </pre>
            </div>
            <div>
              <p className="font-semibold text-zinc-800">Назначение платежа</p>
              <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800">
                {paymentTemplate}
              </pre>
              <div className="mt-3">
                <CopyToClipboard text={paymentTemplate} label="Скопировать назначение" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Сроки</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            <li>
              • Оплата взносов: до{" "}
              <span className="font-semibold">{feesPaymentDeadlineDay} числа</span> каждого месяца.
            </li>
            <li>• Сверка начислений: в течение 10 дней после оплаты.</li>
            <li>• Изменения в сроках публикуются в личном кабинете.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            Что считается долгом и что будет дальше
          </h2>
          <p className="mt-3 text-sm text-zinc-700">
            Задолженность — неоплаченный взнос после установленного срока. Уведомления направляет
            правление. Дополнительные начисления возможны только по решениям общего собрания или по
            договорным условиям. По вопросам задолженности и реструктуризации обращайтесь в
            правление.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
            <li>Уточнить начисления можно через обращение в правление.</li>
            <li>Квитанции лучше сохранять для сверки.</li>
          </ul>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <FaqSearch items={FEES_FAQ} />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Куда обращаться</h2>
          <p className="mt-3 text-sm text-zinc-700">
            По вопросам оплаты и начислений обращайтесь в правление через официальные каналы или
            форму обращения в кабинете.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href={OFFICIAL_CHANNELS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Telegram
            </a>
            <a
              href={OFFICIAL_CHANNELS.vk}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              VK
            </a>
            <Link
              href="/contacts"
              className="rounded-full border border-zinc-300 px-4 py-2 font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Контакты
            </Link>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
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
      </div>
    </main>
  );
}
