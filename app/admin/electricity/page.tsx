import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { clearNotified, getAllElectricity, markNotified } from "@/lib/electricity";
import { NoticeClient } from "./NoticeClient";

const statusText = (entry: { lastReading: number | null; debt: number | null }) => {
  if (entry.lastReading == null) return "Не переданы";
  if (entry.debt != null && entry.debt > 0) return "Есть долг";
  return "Переданы";
};

async function markAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const ids = (formData.get("ids") as string | null)?.split(",").filter(Boolean) ?? [];
  const mode = formData.get("mode");
  if (mode === "mark") {
    await markNotified(ids);
  } else if (mode === "clear") {
    await clearNotified(ids);
  }
}

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function AdminElectricityPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");

  const items = await getAllElectricity();
  const onlyMissing =
    typeof params.missing === "string" ? params.missing === "1" : false;
  const onlyNotified =
    typeof params.notified === "string" ? params.notified === "1" : false;
  const filtered = [...items].filter((item) => {
    if (onlyMissing && (item.lastReading == null || item.lastReadingDate == null)) {
      // keep
    } else if (onlyMissing) {
      return false;
    }
    if (onlyNotified && item.notified) return false;
    return true;
  });
  const sorted = filtered.sort((a, b) => {
    if (a.lastReading == null && b.lastReading != null) return -1;
    if (a.lastReading != null && b.lastReading == null) return 1;
    if ((a.debt ?? 0) > 0 && (b.debt ?? 0) <= 0) return -1;
    if ((a.debt ?? 0) <= 0 && (b.debt ?? 0) > 0) return 1;
    return 0;
  });
  const visibleIds = filtered.map((i) => i.userId).join(",");

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Электроэнергия (MVP)</h1>
          <div className="text-sm text-zinc-700">Всего: {sorted.length}</div>
        </div>

        <form className="flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="missing"
              value="1"
              defaultChecked={onlyMissing}
              className="h-4 w-4"
            />
            Только не передали
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              name="notified"
              value="1"
              defaultChecked={onlyNotified}
              className="h-4 w-4"
            />
            Только не уведомлённые
          </label>
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm font-semibold text-zinc-800 hover:border-zinc-400"
          >
            Применить
          </button>
          <a
            href="/admin/electricity"
            className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:border-zinc-300"
          >
            Сбросить
          </a>
        </form>

        <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <form action={markAction}>
            <input type="hidden" name="ids" value={visibleIds} />
            <input type="hidden" name="mode" value="mark" />
            <button
              type="submit"
              className="rounded-full bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4d5d40]"
              disabled={!visibleIds}
            >
              Отметить уведомлёнными (всех в списке)
            </button>
          </form>
          <form action={markAction}>
            <input type="hidden" name="ids" value={visibleIds} />
            <input type="hidden" name="mode" value="clear" />
            <button
              type="submit"
              className="rounded-full border border-[#5E704F] px-3 py-2 text-sm font-semibold text-[#5E704F] hover:bg-[#f1f5ed]"
              disabled={!visibleIds}
            >
              Сбросить уведомления (всех в списке)
            </button>
          </form>
        </div>

        <NoticeClient items={filtered.map((i) => ({ plotNumber: i.plotNumber || "—", street: null }))} />

        <div className="space-y-3">
          {sorted.length === 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
              Данные отсутствуют.
            </div>
          )}
          {filtered.map((e) => (
            <div key={`${e.userId}-${e.plotNumber}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between text-sm text-zinc-800">
                <div>
                  Участок: <span className="font-semibold">{e.plotNumber || "—"}</span>
                </div>
                <div>Пользователь: {e.userId || "—"}</div>
              </div>
              <div className="mt-2 grid gap-2 text-sm text-zinc-800 sm:grid-cols-4">
                <div>Показания: {e.lastReading != null ? e.lastReading : "Не переданы"}</div>
                <div>
                  Дата:{" "}
                  {e.lastReadingDate ? new Date(e.lastReadingDate).toLocaleString("ru-RU") : "—"}
                </div>
                <div>Долг: {e.debt == null ? "Нет данных" : `${e.debt} ₽`}</div>
                <div>Статус: {statusText(e)}</div>
                <div>Уведомление: {e.notified ? "Да" : "Нет"}</div>
                <div>
                  Уведомлён:{" "}
                  {e.notifiedAt ? new Date(e.notifiedAt).toLocaleString("ru-RU") : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
