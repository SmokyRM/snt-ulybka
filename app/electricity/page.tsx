import ElectricityCalculator from "@/components/ElectricityCalculator";
import FaqSearch from "@/components/FaqSearch";
import { ELECTRICITY_TARIFF_RUB_PER_KWH } from "@/content/electricity";

export const metadata = {
  title: "Электроэнергия — СНТ «Улыбка»",
  description: "Информация об оплате электроэнергии и переходе на прямой договор.",
};

export default function ElectricityPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#5E704F]">
            Электроэнергия
          </p>
          <h1 className="text-3xl font-semibold">Оплата и учет</h1>
          <p className="text-sm text-zinc-700">
            Тариф СНТ: {ELECTRICITY_TARIFF_RUB_PER_KWH.toFixed(2)} ₽ за 1 кВт·ч. Ниже — инструкция
            по оплате, калькулятор и ответы на вопросы.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900">Как оплатить</h2>
            <ol className="mt-4 space-y-3 text-sm text-zinc-700">
              <li>1. Передайте показания счетчика до 25 числа текущего месяца.</li>
              <li>2. Рассчитайте сумму по тарифу и сформируйте платеж.</li>
              <li>3. Оплатите по реквизитам СНТ, указав участок и период.</li>
              <li>4. Сохраните квитанцию и отправьте в правление при необходимости.</li>
            </ol>
          </div>
          <ElectricityCalculator />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Переход на прямой договор</h2>
          <p className="mt-3 text-sm text-zinc-700">
            Для перехода на прямой договор с энергосбытом потребуется согласовать это решение с
            правлением, подготовить документы на участок и счетчик, а также подписать необходимые
            формы. Здесь будет размещена подробная инструкция и список документов.
          </p>
        </section>

        <section>
          <FaqSearch />
        </section>
      </div>
    </main>
  );
}
