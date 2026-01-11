import { redirect } from "next/navigation";
import Link from "next/link";
import { APPEAL_TOPICS, checkAppealRateLimit, createAppeal } from "@/lib/appeals";
import { getSessionUser } from "@/lib/session.server";
import NewAppealFormClient from "../NewAppealFormClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function createAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !user.id) {
    redirect("/login?next=/cabinet/appeals/new");
  }
  const topic = (formData.get("topic") as string | null) ?? "Общее";
  const message = (formData.get("message") as string | null) ?? "";
  const trimmed = message.trim();
  if (!APPEAL_TOPICS.includes(topic)) {
    redirect("/cabinet/appeals/new?error=topic");
  }
  if (trimmed.length < 10 || trimmed.length > 4000) {
    redirect("/cabinet/appeals/new?error=validation");
  }
  if (!checkAppealRateLimit(user.id)) {
    redirect("/cabinet/appeals/new?error=rate");
  }
  const created = await createAppeal(user.id, trimmed, topic);
  const suffix = created?.id ? `?submitted=${created.id}` : "?submitted=1";
  redirect(`/cabinet/appeals${suffix}`);
}

export default async function NewAppealPage({ searchParams }: Props) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const prefill = typeof params.prefill === "string" ? params.prefill : "";
  const error = typeof params.error === "string" ? params.error : "";
  const user = await getSessionUser();
  if (!user || !user.id) {
    redirect("/login?next=/cabinet/appeals/new");
  }

  return (
    <main
      className="min-h-screen bg-[#F8F1E9] px-4 py-8 text-zinc-900 sm:px-6"
      data-testid="cabinet-appeals-new-form"
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Новое обращение</h1>
            <p className="text-sm text-zinc-600">Опишите вопрос — правление ответит в рабочее время.</p>
          </div>
          <Link
            href="/cabinet/appeals"
            className="text-sm font-semibold text-[#5E704F] hover:underline"
          >
            ← Мои обращения
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-[#5E704F]">
          <Link href="/cabinet" className="hover:underline">
            ← В кабинет
          </Link>
          <Link href="/" className="hover:underline">
            На главную
          </Link>
        </div>

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error === "rate"
              ? "Слишком много обращений. Попробуйте позже."
              : error === "validation"
                ? "Сообщение должно быть от 10 до 4000 символов."
                : error === "topic"
                  ? "Выберите допустимую тему."
                  : "Не удалось отправить обращение."}
          </div>
        ) : null}

        <NewAppealFormClient action={createAction} prefill={prefill} topics={APPEAL_TOPICS} />
      </div>
    </main>
  );
}
