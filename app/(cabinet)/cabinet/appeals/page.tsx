import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { markAppealRead } from "@/lib/appeals";
import { getUserAppeals } from "@/lib/appeals";

const statusLabel: Record<string, string> = {
  draft: "Черновик",
  new: "Новое",
  in_progress: "В работе",
  answered: "Отвечено",
  closed: "Закрыто",
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AppealsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/cabinet/appeals");
  }
  if (!user.id) {
    return (
      <main
        className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6"
        data-testid="cabinet-appeals-root"
      >
        <div className="mx-auto w-full max-w-3xl space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          <div className="text-base font-semibold">Не удалось определить пользователя</div>
          <p>Обновите страницу или войдите заново.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/login?next=/cabinet/appeals"
              className="rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4b5b40]"
            >
              Войти снова
            </Link>
            <Link
              href="/cabinet"
              className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-[#5E704F] hover:border-[#5E704F]"
            >
              В кабинет
            </Link>
          </div>
        </div>
      </main>
    );
  }
  const userId = user.id;
  const appeals = await getUserAppeals(user.id);
  const params = (await Promise.resolve(searchParams)) ?? {};
  const submittedId = typeof params.submitted === "string" ? params.submitted : null;
  const unreadCount = appeals.filter((a) => a.unreadByUser).length;

  async function markAsReadAction(formData: FormData) {
    "use server";
    const appealId = (formData.get("id") as string | null) ?? "";
    await markAppealRead(appealId, userId);
    redirect("/cabinet/appeals");
  }

  return (
    <main
      className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6"
      data-testid="cabinet-appeals-root"
    >
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Мои обращения</h1>
            <p className="text-sm text-zinc-600">
              Напишите вопрос правлению и следите за статусом ответа.
            </p>
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Есть ответы: {unreadCount}
            </span>
          ) : null}
          <Link
            href="/cabinet/appeals/new"
            className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
          >
            Новое обращение
          </Link>
        </div>

        {submittedId ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
            <div className="font-semibold">Обращение принято</div>
            <div className="mt-1 text-green-700">
              Номер: {submittedId}. Статус: Принято. Ответ придёт в ваш кабинет.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href="/cabinet/appeals"
                className="rounded-full border border-green-300 px-3 py-1 text-xs font-semibold text-green-800 hover:border-green-500"
              >
                Обновить список
              </a>
            </div>
          </div>
        ) : null}

        {appeals.length === 0 ? (
          <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 shadow-sm">
            <div className="text-base font-semibold text-zinc-900">Обращений пока нет</div>
            <p className="text-zinc-700">
              Напишите вопрос правлению, если что-то непонятно. Ответ придёт сюда.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/cabinet/appeals/new"
                data-testid="cabinet-appeals-empty-cta"
                className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b5b40]"
              >
                Создать обращение
              </Link>
              <Link
                href="/cabinet"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
              >
                В кабинет
              </Link>
              <Link
                href="/"
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-[#5E704F] hover:border-[#5E704F]"
              >
                На главную
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {appeals.map((appeal) => (
              <div
                key={appeal.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                  <div className="font-semibold text-zinc-800">{appeal.topic}</div>
                  <div>{new Date(appeal.createdAt).toLocaleString("ru-RU")}</div>
                </div>
                <div className="mt-2 text-sm text-zinc-800 whitespace-pre-wrap">
                  {appeal.message}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-600">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 font-semibold text-zinc-700">
                    {statusLabel[appeal.status] ?? appeal.status}
                  </span>
                  {appeal.unreadByUser ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                      Есть ответ
                    </span>
                  ) : null}
                  <div>Обновлено: {new Date(appeal.updatedAt).toLocaleString("ru-RU")}</div>
                </div>
                {appeal.adminReply ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                    <div className="text-xs font-semibold text-zinc-600">Ответ правления</div>
                    <p className="mt-1 whitespace-pre-wrap">{appeal.adminReply}</p>
                  </div>
                ) : null}
                <form
                  action={markAsReadAction}
                  className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600"
                >
                  <input type="hidden" name="id" value={appeal.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-200 px-3 py-1 font-semibold text-[#5E704F] hover:border-[#5E704F]"
                  >
                    Пометить прочитанным
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
