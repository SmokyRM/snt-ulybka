import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { createAppealAction } from "../actions";

export default async function CabinetAppealNew() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/appeals/new");

  return (
    <div className="space-y-4" data-testid="cabinet-appeals-new-root">
      <h1 className="text-2xl font-semibold text-zinc-900">Новое обращение</h1>
      <form action={createAppealAction} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="authorId" value={user.id} />
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Тема
          <input
            name="title"
            required
            minLength={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Коротко опишите суть"
          />
        </label>
        <label className="block space-y-2 text-sm font-semibold text-zinc-900">
          Описание
          <textarea
            name="body"
            required
            minLength={10}
            rows={5}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Подробности обращения"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
