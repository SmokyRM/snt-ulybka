export const metadata = {
  title: "Безопасность и данные",
  alternates: {
    canonical: "/security",
  },
};

const sections = [
  {
    title: "Что мы храним",
    body: "Контактные данные, информацию об участке, историю обращений и платежей. Это нужно, чтобы показывать вам корректные данные по СНТ.",
  },
  {
    title: "Кто что видит",
    body: "Жители видят только данные по своим участкам. Правление видит заявки и подтверждающие документы, чтобы проверить доступ.",
  },
  {
    title: "Как подтверждаем доступ",
    body: "Доступ подтверждает правление вручную. Обычно это занимает 1–2 рабочих дня.",
  },
  {
    title: "Если данные изменились",
    body: "Если сменился владелец, телефон или адрес — отправьте обращение или обновите данные в кабинете. Мы поможем всё проверить.",
  },
  {
    title: "Как удалить доступ",
    body: "Вы можете запросить удаление доступа через обращение или связаться с правлением. Мы уточним детали и закроем доступ.",
  },
];

export default function SecurityPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 text-zinc-900 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Безопасность и данные</h1>
        <p className="text-sm text-zinc-500">
          Коротко о том, как мы храним данные и подтверждаем доступ.
        </p>
      </header>

      <section className="mt-6 space-y-3">
        {sections.map((item) => (
          <details
            key={item.title}
            className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="text-sm font-semibold text-zinc-900">{item.title}</span>
              <span className="text-xs text-zinc-500 transition-transform group-open:rotate-90">
                ▶
              </span>
            </summary>
            <p className="mt-3 text-sm text-zinc-700">{item.body}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
