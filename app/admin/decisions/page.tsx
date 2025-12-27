import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "@/lib/session.server";
import { addDecision, deleteDecision, getDecisions } from "@/lib/decisions";

async function createDecision(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");
  const title = (formData.get("title") as string | null) ?? "";
  const date = (formData.get("date") as string | null) ?? "";
  const docUrl = (formData.get("docUrl") as string | null) ?? "";
  const notes = (formData.get("notes") as string | null) ?? null;
  await addDecision({ title, date, docUrl, notes });
  redirect("/admin/decisions");
}

async function removeDecision(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");
  const id = formData.get("id") as string | null;
  if (id) await deleteDecision(id);
  redirect("/admin/decisions");
}

export default async function DecisionsPage() {
  const user = await getSessionUser();
  if (!isAdmin(user)) redirect("/login?next=/admin");

  const decisions = await getDecisions();

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Решения / протоколы</h1>
          <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
            Только для админов
          </span>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Добавить</h2>
          <form action={createDecision} className="mt-3 grid gap-3 text-sm">
            <label className="text-zinc-800">
              Заголовок
              <input type="text" name="title" required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-zinc-800">
              Дата
              <input type="date" name="date" required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-zinc-800">
              Ссылка на документ
              <input type="url" name="docUrl" required className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <label className="text-zinc-800">
              Примечание
              <textarea name="notes" rows={2} className="mt-1 w-full rounded border border-zinc-300 px-3 py-2" />
            </label>
            <button
              type="submit"
              className="self-start rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4d5d40]"
            >
              Добавить
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Список</h2>
          {decisions.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-700">Пока нет записей.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {decisions.map((d) => (
                <div key={d.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                  <div className="font-semibold text-zinc-900">{d.title}</div>
                  <div className="text-xs text-zinc-600">Дата: {d.date}</div>
                  <a href={d.docUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#5E704F] underline">
                    Открыть документ
                  </a>
                  {d.notes && <div className="text-xs text-zinc-600">Примечание: {d.notes}</div>}
                  <form action={removeDecision} className="mt-2">
                    <input type="hidden" name="id" value={d.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-400"
                    >
                      Удалить
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
