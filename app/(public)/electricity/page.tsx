import Link from "next/link";
import { OFFICIAL_CHANNELS } from "@/config/officialChannels";
import { getSntSettings } from "@/lib/sntSettings";

export const metadata = {
  title: "Электроэнергия — СНТ «Улыбка»",
  description: "Информация об оплате электроэнергии и переходе на прямой договор.",
};

export default function ElectricityPage() {
  const settings = getSntSettings();
  const {
    electricityTariffRubPerKwh,
    electricityPaymentDeadlineDay,
    bankRequisitesText,
  } = settings.value;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            Электроэнергия
          </p>
          <h1 className="text-3xl font-semibold">Электроэнергия: оплата и показания</h1>
          <p className="text-sm text-zinc-700">
            Краткая справка по оплате, передаче показаний и срокам. Подробные данные доступны после
            входа в кабинет.
          </p>
          <ul className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
            <li>• Оплата по реквизитам СНТ</li>
            <li>• Передача показаний онлайн</li>
            <li>• Поддержка по спорным начислениям</li>
          </ul>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Как оплачивать</h2>
          <ol className="mt-4 space-y-3 text-sm text-zinc-700">
            <li>1. Передайте показания счётчика за текущий период.</li>
            <li>2. Рассчитайте сумму по действующему тарифу СНТ.</li>
            <li>3. Оплатите по реквизитам СНТ, указав участок и период.</li>
            <li>4. Сохраните квитанцию и при необходимости отправьте правлению.</li>
          </ol>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800">
            Тариф: {electricityTariffRubPerKwh.toFixed(2)} ₽ за 1 кВт·ч.
          </div>
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-800">
            {bankRequisitesText}
          </div>
          <div className="mt-4 text-sm text-zinc-600">
            Прямой договор с энергосбытом оформляется отдельно. Уточняйте порядок и список
            документов у правления.
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Как передать показания</h2>
          <ol className="mt-4 space-y-3 text-sm text-zinc-700">
            <li>1. Зайдите в личный кабинет СНТ.</li>
            <li>2. Откройте раздел «Электроэнергия».</li>
            <li>3. Введите текущие показания счётчика и отправьте.</li>
            <li>4. Проверьте, что статус «Показания приняты» обновился.</li>
          </ol>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Сроки</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-700">
            <li>
              • Передача показаний: до{" "}
              <span className="font-semibold">{electricityPaymentDeadlineDay} числа</span>{" "}
              каждого месяца.
            </li>
            <li>
              • Оплата: до{" "}
              <span className="font-semibold">{electricityPaymentDeadlineDay}</span>{" "}
              числа следующего месяца.
            </li>
            <li>• Уточнение спорных начислений: в течение <span className="font-semibold">10 дней</span> после оплаты.</li>
          </ul>
          <p className="mt-3 text-xs text-zinc-600">
            Если сроки отличаются, правление разместит обновлённую информацию в кабинете.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Частые вопросы</h2>
          <div className="mt-4 space-y-3 text-sm text-zinc-700">
            <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <summary className="cursor-pointer font-semibold text-zinc-900">
                Где посмотреть тариф на электроэнергию?
              </summary>
              <p className="mt-2">
                Тариф публикуется в личном кабинете и в разделе документов СНТ.
              </p>
            </details>
            <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <summary className="cursor-pointer font-semibold text-zinc-900">
                Можно ли передать показания за прошлый месяц?
              </summary>
              <p className="mt-2">
                Да, передайте актуальные показания и свяжитесь с правлением для уточнения начислений.
              </p>
            </details>
            <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <summary className="cursor-pointer font-semibold text-zinc-900">
                Что делать, если счётчик заменён?
              </summary>
              <p className="mt-2">
                Сообщите правлению номер нового счётчика и дату замены, чтобы обновить данные.
              </p>
            </details>
            <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <summary className="cursor-pointer font-semibold text-zinc-900">
                Как перейти на прямой договор?
              </summary>
              <p className="mt-2">
                Обратитесь в правление за перечнем документов и согласованием перехода.
              </p>
            </details>
            <details className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <summary className="cursor-pointer font-semibold text-zinc-900">
                Где задать вопрос по начислениям?
              </summary>
              <p className="mt-2">
                Используйте форму обращения в личном кабинете или напишите в официальные каналы.
              </p>
            </details>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Куда обращаться</h2>
          <p className="mt-3 text-sm text-zinc-700">
            По вопросам электроэнергии обращайтесь в правление через официальные каналы или форму
            обращения в кабинете.
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
