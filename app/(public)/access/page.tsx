import AppLink from "@/components/AppLink";

export const metadata = {
  alternates: {
    canonical: "/access",
  },
};

const steps = [
  {
    title: "Заполните профиль",
    text: "Укажите ФИО и телефон, чтобы правление могло подтвердить собственника.",
  },
  {
    title: "Запросите код доступа",
    text: "Код выдается правлением после проверки сведений об участке.",
  },
  {
    title: "Привяжите участок",
    text: "Введите код и подтвердите привязку участка к своему кабинету.",
  },
  {
    title: "Откройте личный кабинет",
    text: "После привязки доступны начисления, документы и обращения.",
  },
];

export default function AccessPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold">Как получить доступ</h1>
          <p className="text-base text-zinc-700">
            Доступ в личный кабинет предоставляется собственникам участков СНТ после проверки
            данных правлением.
          </p>
        </section>

        <ol className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
