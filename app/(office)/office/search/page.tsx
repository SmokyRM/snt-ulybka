import { redirect } from "next/navigation";
import { getEffectiveSessionUser } from "@/lib/session.server";
import type { Role } from "@/lib/permissions";
import { isStaffOrAdmin } from "@/lib/rbac";
import { searchAll } from "@/server/services/search";
import AppLink from "@/components/AppLink";
import { assignToMeAction } from "../appeals/actions";
import CopyPhoneButton from "./CopyPhoneButton";

type Props = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function OfficeSearchPage({ searchParams }: Props) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/staff-login?next=/office/search");
  const role = (user.role as Role | undefined) ?? "resident";
  if (!isStaffOrAdmin(role)) {
    redirect("/forbidden?reason=office.only&next=/office");
  }

  const params = await (searchParams ?? Promise.resolve({ q: undefined }));
  const query = typeof params.q === "string" ? params.q.trim() : "";

  // Защита от тяжёлых запросов: если q < 2 символов -> показывать "Введите минимум 2 символа"
  const showResults = query.length >= 2;
  const results = showResults ? await searchAll({ q: query, limit: 15 }) : null;

  return (
    <div className="space-y-6" data-testid="search-root">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Поиск</h1>
        <p className="mt-1 text-sm text-zinc-600">Найдите участки, обращения и контакты</p>
      </div>

      {/* Форма поиска */}
      <form method="GET" action="/office/search" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Введите минимум 2 символа для поиска..."
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-base focus:border-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F]/20"
          data-testid="search-input"
          autoFocus
        />
        <button
          type="submit"
          className="rounded-lg bg-[#5E704F] px-6 py-2 font-semibold text-white transition hover:bg-[#4d5d41]"
        >
          Найти
        </button>
      </form>

      {/* Сообщение о минимальной длине запроса */}
      {query.length > 0 && query.length < 2 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Введите минимум 2 символа для поиска
        </div>
      )}

      {/* Результаты поиска */}
      {showResults && results && (
        <div className="space-y-6">
          {/* Секция: Plots */}
          {results.plots.length > 0 && (
            <section data-testid="search-section-plots">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Участки ({results.plots.length})</h2>
              <div className="space-y-2">
                {results.plots.map((plot) => (
                  <div
                    key={plot.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
                    data-testid={`search-item-plot-${plot.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-zinc-900">{plot.plotNumber}</div>
                      {plot.street && <div className="text-sm text-zinc-600">{plot.street}</div>}
                      {plot.ownerName && <div className="text-sm text-zinc-600">Владелец: {plot.ownerName}</div>}
                      {plot.phone && <div className="text-sm text-zinc-500">Телефон: {plot.phone}</div>}
                    </div>
                    <AppLink
                      href={plot.href}
                      className="ml-4 rounded-lg border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                    >
                      Открыть участок
                    </AppLink>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Секция: Appeals */}
          {results.appeals.length > 0 && (
            <section data-testid="search-section-appeals">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Обращения ({results.appeals.length})</h2>
              <div className="space-y-2">
                {results.appeals.map((appeal) => (
                  <div
                    key={appeal.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
                    data-testid={`search-item-appeal-${appeal.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-zinc-900">{appeal.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-zinc-600">
                        {appeal.plotNumber && <span>Участок: {appeal.plotNumber}</span>}
                        {appeal.authorName && <span>Автор: {appeal.authorName}</span>}
                        <span className="text-zinc-500">Статус: {appeal.status}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <AppLink
                        href={appeal.href}
                        className="rounded-lg border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                      >
                        Открыть
                      </AppLink>
                      <form action={assignToMeAction} className="inline">
                        <input type="hidden" name="id" value={appeal.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-[#5E704F] hover:text-[#5E704F]"
                          data-testid={`search-assign-to-me-${appeal.id}`}
                        >
                          Назначить на меня
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Секция: People/Contacts */}
          {results.people && results.people.length > 0 && (
            <section data-testid="search-section-contacts">
              <h2 className="mb-3 text-lg font-semibold text-zinc-900">Контакты ({results.people.length})</h2>
              <div className="space-y-2">
                {results.people.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm"
                    data-testid={`search-item-contact-${contact.id}`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-zinc-900">{contact.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-sm text-zinc-600">
                        {contact.phone && (
                          <span>
                            Телефон: <CopyPhoneButton phone={contact.phone} contactId={contact.id} />
                          </span>
                        )}
                        {contact.email && <span>Email: {contact.email}</span>}
                      </div>
                    </div>
                    {contact.href && (
                      <AppLink
                        href={contact.href}
                        className="ml-4 rounded-lg border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white"
                      >
                        Открыть
                      </AppLink>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Пустое состояние: ничего не найдено */}
          {results.plots.length === 0 && results.appeals.length === 0 && (!results.people || results.people.length === 0) && (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center" data-testid="search-empty">
              <p className="text-sm font-medium text-zinc-700">Ничего не найдено</p>
              <p className="mt-1 text-xs text-zinc-500">Попробуйте изменить поисковый запрос</p>
            </div>
          )}
        </div>
      )}

      {/* Пустое состояние: запрос не введён */}
      {!query && (
        <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center" data-testid="search-empty">
          <p className="text-sm font-medium text-zinc-700">Введите поисковый запрос</p>
          <p className="mt-1 text-xs text-zinc-500">Найдите участки, обращения и контакты по номеру телефона, ФИО, номеру участка или ID</p>
        </div>
      )}
    </div>
  );
}
