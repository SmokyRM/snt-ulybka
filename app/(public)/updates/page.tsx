export const metadata = {
  title: "Что нового на сайте",
  alternates: {
    canonical: "/updates",
  },
};

const updates = [
  {
    date: "4 января",
    items: [
      "На главной теперь одна понятная кнопка «Войти в личный кабинет».",
      "Для тех, кто заходит впервые, есть подсказка «Как получить доступ».",
      "«Частые вопросы» стали удобнее — ответы открываются по клику.",
      "Контакты правления кликабельны: можно сразу позвонить или написать.",
      "Помощник подсказывает, где найти нужный раздел.",
    ],
  },
];

export default function UpdatesPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 text-zinc-900 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Что нового на сайте</h1>
        <p className="text-sm text-zinc-500">
          Коротко рассказываем, что меняется и зачем — без технических терминов.
        </p>
      </header>

      <section className="mt-6 space-y-4">
        {updates.map((entry) => (
          <article
            key={entry.date}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="text-sm font-semibold text-zinc-900">{entry.date}</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
              {entry.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
