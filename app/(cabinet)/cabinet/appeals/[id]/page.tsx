import { notFound, redirect } from "next/navigation";
import { getAppeal, listAppealMessages } from "@/lib/appeals.store";
import { getEffectiveSessionUser } from "@/lib/session.server";

export default async function CabinetAppealDetail({ params }: { params: { id: string } }) {
  const user = await getEffectiveSessionUser();
  if (!user) redirect("/login?next=/cabinet/appeals");
  if (user.role !== "resident") {
    redirect("/forbidden");
  }
  const appeal = getAppeal(params.id);
  if (!appeal || (appeal.authorId && appeal.authorId !== user.id)) {
    notFound();
  }
  const messages = listAppealMessages(appeal.id).filter((m) => m.visibility === "resident");
  return (
    <div className="space-y-3" data-testid="cabinet-appeal-root">
      <h1 className="text-2xl font-semibold text-zinc-900">{appeal.title}</h1>
      <div className="text-sm text-zinc-600" data-testid="cabinet-appeal-status">
        Статус: {appeal.status}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
        <p className="whitespace-pre-wrap">{appeal.body}</p>
        <div className="mt-2 text-xs text-zinc-500">
          Отправлено: {new Date(appeal.createdAt).toLocaleString("ru-RU")}
        </div>
      </div>
      {messages.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm" data-testid="cabinet-appeal-messages">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ответы правления</div>
          <div className="mt-2 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <div className="text-xs text-zinc-500">
                  {new Date(m.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {appeal.comments?.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm" data-testid="cabinet-appeal-comments">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Комментарии</div>
          <div className="mt-2 space-y-3">
            {appeal.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <div className="text-xs text-zinc-500">
                  {new Date(c.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                  {c.authorRole ? ` · ${c.authorRole}` : ""}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {appeal.history?.length ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm" data-testid="cabinet-appeal-history">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">История статусов</div>
          <div className="mt-2 space-y-2">
            {appeal.history.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                <span>{h.text}</span>
                <span>
                  {new Date(h.createdAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
