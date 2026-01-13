import { notFound, redirect } from "next/navigation";
import { getAppeal } from "@/lib/appeals.store";
import { getSessionUser } from "@/lib/session.server";

export default async function CabinetAppealDetail({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cabinet/appeals");
  const appeal = getAppeal(params.id);
  if (!appeal || (appeal.authorId && appeal.authorId !== user.id)) {
    notFound();
  }
  return (
    <div className="space-y-3" data-testid="cabinet-appeal-root">
      <h1 className="text-2xl font-semibold text-zinc-900">{appeal.title}</h1>
      <div className="text-sm text-zinc-600">Статус: {appeal.status}</div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-sm">
        <p className="whitespace-pre-wrap">{appeal.body}</p>
        <div className="mt-2 text-xs text-zinc-500">
          Отправлено: {new Date(appeal.createdAt).toLocaleString("ru-RU")}
        </div>
      </div>
    </div>
  );
}
