import AppLink from "@/components/AppLink";

export const metadata = {
  alternates: {
    canonical: "/access",
  },
};

const steps = [
  {
    title: "Войдите",
    text: "Войдите через кнопку «Войти» (любой email или телефон).",
  },
  {
    title: "Укажите участок",
    text: "Введите адрес участка (например: «Берёзовая, 12») или код, если он уже есть.",
  },
  {
    title: "Дождитесь проверки",
    text: "Правление проверит заявку за 1–2 дня.",
  },
  {
    title: "Пользуйтесь кабинетом",
    text: "Готово — откроется доступ к начислениям, документам и обращениям.",
  },
];

export default function AccessPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold">Как получить доступ</h1>
          <p className="text-base text-zinc-700">
            Доступ в личный кабинет появляется после проверки правлением.
          </p>
        </section>

        <ol
          id="instructions"
          className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5E704F] text-sm font-semibold text-white">
                {index + 1}
              </div>
              <div>
                <div className="text-base font-semibold">{step.title}</div>
                <div className="text-sm text-zinc-600">{step.text}</div>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-sm text-zinc-600">
          Нет кода?{" "}
          <AppLink href="#instructions" className="text-[#5E704F] underline">
            → Инструкция ниже
          </AppLink>
        </p>

        <div className="flex flex-wrap gap-3">
          <AppLink
            href="/login"
            className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4E5F41]"
          >
            Войти в личный кабинет
          </AppLink>
          <AppLink
            href="/contacts"
            className="rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
          >
            Связаться с правлением
          </AppLink>
        </div>
      </div>
    </main>
  );
}
