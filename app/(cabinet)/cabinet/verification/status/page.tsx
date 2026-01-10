import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserOwnershipVerifications, getUserPlots } from "@/lib/plots";
import { getVerificationStatus } from "@/lib/verificationStatus";

export const metadata = {
  title: "Проверка участка — статус",
};

export default async function VerificationStatusPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const userId = user.id ?? "";
  const [plots, verifications] = await Promise.all([
    getUserPlots(userId),
    getUserOwnershipVerifications(userId),
  ]);
  const { status } = getVerificationStatus(plots, verifications);

  if (status === "verified") {
    redirect("/cabinet");
  }
  if (status !== "pending") {
    redirect("/cabinet/verification");
  }

  const statusParam = typeof sp.status === "string" ? sp.status : null;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Проверка статуса
          </div>
          <h1 className="text-2xl font-semibold">Статус проверки</h1>
          <p className="text-sm text-zinc-600">
            Мы проверяем информацию по вашему участку. Обычно это занимает 1–2 рабочих дня.
          </p>
        </header>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-800 shadow-sm">
          <div className="font-semibold text-sky-700">⏳ На проверке</div>
          <p className="mt-1 text-sm text-sky-800">
            Заявка получена{statusParam ? ` (${statusParam})` : ""}. Если понадобятся уточнения, мы
            напишем здесь или в разделе &quot;Доступ и проверка&quot;.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
            <Link href="/cabinet/verification" className="hover:text-[#5E704F] hover:underline">
              Доступ и проверка
            </Link>
            <Link href="/help#verification" className="hover:text-[#5E704F] hover:underline">
              Как проходит проверка
            </Link>
            <Link href="/help" className="hover:text-[#5E704F] hover:underline">
              Контакты правления
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#5E704F] underline">
          <Link href="/cabinet">← Вернуться в кабинет</Link>
          <Link href="/">← На главную</Link>
        </div>
      </div>
    </main>
  );
}
