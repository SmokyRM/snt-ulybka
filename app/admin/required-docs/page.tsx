import { redirect } from "next/navigation";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { addRequiredDoc, deleteRequiredDoc, getRequiredDocsForUser, type RequiredDoc } from "@/lib/requiredDocs";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

async function createDoc(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const title = (formData.get("title") as string | null) ?? "";
  const url = (formData.get("url") as string | null) ?? "";
  const requiredFor = (formData.get("requiredFor") as "all" | "members" | "non-members" | null) ?? "all";
  await addRequiredDoc({ title, url, requiredFor });
  redirect("/admin/required-docs");
}

async function removeDoc(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");
  const id = formData.get("id") as string | null;
  if (id) {
    await deleteRequiredDoc(id);
  }
  redirect("/admin/required-docs");
}

export default async function RequiredDocsAdminPage({}: { searchParams?: SearchParams }) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) redirect("/login?next=/admin");

  if (!user?.id) redirect("/login?next=/admin");
  const docs = await getRequiredDocsForUser({ userId: user.id, membershipStatus: "member" });

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-10 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Обязательные документы</h1>
          <span className="rounded-full bg-[#2F3827]/10 px-3 py-1 text-xs font-semibold text-[#2F3827]">
            Только для админов
          </span>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Добавить документ</h2>
          <form action={createDoc} className="mt-3 grid gap-3 text-sm">
            <label className="text-zinc-800">
              Заголовок
              <input
                type="text"
                name="title"
                required
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-zinc-800">
              Ссылка
              <input
                type="url"
                name="url"
                required
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </label>
            <label className="text-zinc-800">
              Кому обязательно
              <select
                name="requiredFor"
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
                defaultValue="all"
              >
                <option value="all">Все</option>
                <option value="members">Члены</option>
                <option value="non-members">Не члены</option>
              </select>
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
          <h2 className="text-lg font-semibold text-zinc-900">Список документов</h2>
          {docs.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-700">Пока нет обязательных документов.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {docs.map((d: RequiredDoc & { acked: boolean; ackAt: string | null }) => (
                <div key={d.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800">
                  <div className="font-semibold text-zinc-900">{d.title}</div>
                  <div className="text-xs text-zinc-600">
                    Опубликовано: {new Date(d.publishedAt).toLocaleDateString("ru-RU")}
                  </div>
                  <div className="text-xs text-zinc-600">Для: {d.requiredFor}</div>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-xs font-semibold text-[#5E704F] underline"
                  >
                    Открыть
                  </a>
                  <form action={removeDoc} className="mt-2">
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
