import CopyToClipboard from "@/components/CopyToClipboard";
import FeesCalculator from "@/components/FeesCalculator";
import { FEES_FAQ } from "@/content/fees";

export const metadata = {
  title: "Взносы и долги — СНТ «Улыбка»",
  description:
    "Формула расчёта взносов, сроки оплаты, реквизиты и ответы на частые вопросы.",
};

export default function FeesPage() {
  const paymentTemplate =
    "СНТ Улыбка; улица <...>; участок <...>; период <...>; площадь <...> сот.; взносы";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            Взносы и долги
          </p>
          <h1 className="text-3xl font-semibold">Взносы и долги</h1>
          <p className="text-sm text-zinc-700">
            Формула расчёта, сроки, реквизиты и ответы на частые вопросы.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">
              Как рассчитываются взносы
            </h2>
            <p className="mt-3 text-sm text-zinc-700">
              Площадь участка (сотки) × ставка (₽/сотка) = сумма к оплате.
              Размер платежей определяется решениями общего собрания и применяется по правилам СНТ.
            </p>
          </div>
          <FeesCalculator />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Как оплатить</h2>
          <p className="mt-3 text-sm text-zinc-700">
            Реквизиты будут размещены здесь. Укажите в назначении платежа данные участка и период.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-zinc-700 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-zinc-800">Реквизиты</p>
              <ul className="mt-2 space-y-1">
                <li>Получатель: СНТ «Улыбка»</li>
                <li>ИНН/КПП: —</li>
                <li>Банк: —</li>
                <li>Р/с: —</li>
                <li>Кор/с: —</li>
                <li>БИК: —</li>
              </ul>
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
          <h2 className="text-xl font-semibold text-zinc-900">
            Что считается долгом и что будет дальше
          </h2>
          <p className="mt-3 text-sm text-zinc-700">
            Задолженность — неоплаченный взнос после установленного срока. Уведомления направляет
            правление. Дополнительные начисления возможны только по решениям общего собрания или по
            договорным условиям. По вопросам задолженности и реструктуризации обращайтесь в
            правление.
          </p>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">FAQ</h2>
          <div className="mt-4 space-y-3">
            {FEES_FAQ.map((item, idx) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-zinc-200 bg-white p-4 transition-colors"
                open={idx === 0}
              >
                <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-6 text-zinc-700">{item.a}</p>
                {item.tags && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#5E704F]/10 px-3 py-1 text-xs font-semibold text-[#5E704F]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
