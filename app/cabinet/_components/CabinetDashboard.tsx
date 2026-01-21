import { CabinetCard } from "./CabinetCard";
import { EmptyState } from "./EmptyState";
import type { QaCabinetMockData } from "../_dev/qaMockData";

export default function CabinetDashboard({ mock }: { mock: QaCabinetMockData | null }) {
  const hasMock = Boolean(mock);

  const financeCard = hasMock ? (
    <div className="space-y-2 text-sm text-zinc-800">
      <div className="flex items-center justify-between">
        <span>Статус</span>
        <span className="font-semibold">
          {mock?.cabinetContext.finance.status === "debt" ? "Долг" : "Ок"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>Членские</span>
        <span className="font-semibold">
          {mock?.cabinetContext.finance.membershipDebt ?? 0} ₽
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>Электро</span>
        <span className="font-semibold">
          {mock?.cabinetContext.finance.electricityDebt ?? 0} ₽
        </span>
      </div>
    </div>
  ) : (
    <EmptyState
      title="Нет данных по взносам"
      description="Импортируйте данные или включите QA mock."
      actionHref="/cabinet/docs"
      actionLabel="Документы"
    />
  );

  const powerCard = hasMock ? (
    <div className="space-y-2 text-sm text-zinc-800">
      <div className="flex items-center justify-between">
        <span>Последнее показание</span>
        <span className="font-semibold">{mock?.electricity.lastReading ?? "—"}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Дата</span>
        <span className="text-xs text-zinc-600">
          {mock?.electricity.lastReadingDate
            ? new Date(mock.electricity.lastReadingDate).toLocaleDateString("ru-RU")
            : "—"}
        </span>
      </div>
    </div>
  ) : (
    <EmptyState
      title="Нет показаний"
      description="Пока нет данных. Передайте показания или включите QA mock."
      actionHref="/cabinet/power"
      actionLabel="Передать показания"
    />
  );

  const appealsCard = hasMock ? (
    <ul className="space-y-2 text-sm text-zinc-800">
      {mock?.appeals.slice(0, 3).map((a) => (
        <li key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{a.status}</span>
            <span className="text-[11px] text-zinc-500">
              {new Date(a.createdAt).toLocaleDateString("ru-RU")}
            </span>
          </div>
          <p className="text-sm text-zinc-700">{a.message}</p>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      title="Обращений пока нет"
      description="Создайте обращение или включите QA mock."
      actionHref="/cabinet/appeals"
      actionLabel="Создать обращение"
    />
  );

  const docsCard = hasMock ? (
    <ul className="space-y-2 text-sm text-zinc-800">
      {mock?.requiredDocs.slice(0, 4).map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
          <a href={doc.url} className="text-[#5E704F] underline" target="_blank" rel="noreferrer">
            {doc.title}
          </a>
          <span className="text-[11px] text-zinc-500">{doc.acked ? "Подтверждено" : "Нужно ознакомиться"}</span>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      title="Документы не найдены"
      description="Добавьте документы или включите QA mock для примера."
      actionHref="/cabinet/help"
      actionLabel="Помощь"
    />
  );

  const announcementsCard = hasMock ? (
    <ul className="space-y-2 text-sm text-zinc-800">
      {mock?.announcements.slice(0, 3).map((a) => (
        <li key={a.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{a.title}</span>
            <span className="text-[11px] text-zinc-500">
              {new Date(a.publishedAt).toLocaleDateString("ru-RU")}
            </span>
          </div>
          <p className="text-sm text-zinc-700">{a.body}</p>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState title="Пока нет объявлений" description="Объявления появятся позже." />
  );

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Личный кабинет</h1>
          <p className="text-sm text-zinc-600">
            Дашборд с основными показателями. {hasMock ? "Данные заполнены QA моками." : "Данных нет — включите QA mock для примера."}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <CabinetCard title="Взносы" subtitle="Долг / переплата" actionHref="/cabinet/payments" actionLabel="Перейти">
            {financeCard}
          </CabinetCard>

          <CabinetCard title="Электроэнергия" subtitle="Последнее показание" actionHref="/cabinet/power" actionLabel="Передать показания">
            {powerCard}
          </CabinetCard>

          <CabinetCard title="Обращения" subtitle="Активные обращения" actionHref="/cabinet/appeals" actionLabel="Создать обращение">
            {appealsCard}
          </CabinetCard>

          <CabinetCard title="Документы" subtitle="Быстрые ссылки" actionHref="/cabinet/docs" actionLabel="Открыть документы">
            {docsCard}
          </CabinetCard>

          <CabinetCard title="Объявления" subtitle="Новости СНТ" actionHref="/cabinet/docs" actionLabel="Все объявления">
            {announcementsCard}
          </CabinetCard>
        </div>
      </div>
    </main>
  );
}
