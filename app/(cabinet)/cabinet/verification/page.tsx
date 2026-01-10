import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session.server";
import { getUserOwnershipVerifications, getUserPlots } from "@/lib/plots";
import { getVerificationStatus } from "@/lib/verificationStatus";
import { getUserProfile } from "@/lib/userProfiles";

export default async function VerificationPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "user" && user.role !== "board")) {
    redirect("/login");
  }
  const userId = user.id ?? "";
  const [plots, verifications, profile] = await Promise.all([
    getUserPlots(userId),
    getUserOwnershipVerifications(userId),
    getUserProfile(userId),
  ]);
  const profileComplete = Boolean(profile.fullName && profile.phone);
  const { status, latest } = getVerificationStatus(plots, verifications);
  const reviewNote = latest?.status === "rejected" ? latest.reviewNote : null;
  const hasPlots = plots.length > 0;
  const verificationsSent = verifications.filter((v) => v.status === "sent").length;
  const verificationsApproved = verifications.filter((v) => v.status === "approved").length;
  const showSendVerification =
    profileComplete &&
    hasPlots &&
    status === "draft" &&
    verificationsSent === 0 &&
    verificationsApproved === 0;

  if ((status as string) === "verified") {
    redirect("/cabinet");
  }

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <div className="text-xs text-zinc-500">
            <Link href="/cabinet" className="hover:text-[#5E704F] hover:underline">
              Личный кабинет
            </Link>{" "}
            → Доступ и проверка
          </div>
          <h1 className="text-2xl font-semibold">Доступ и проверка</h1>
          <p className="text-sm text-zinc-600">
            Проверяем связь с участком, чтобы открыть персональные данные.
          </p>
          {user.role === "admin" ? (
            <div>
              <Link
                href="/admin"
                className="text-xs text-zinc-500 transition hover:text-[#5E704F] hover:underline"
              >
                Перейти в админку →
              </Link>
            </div>
          ) : null}
        </header>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-800 shadow-sm">
          {!profileComplete ? (
            <>
              <div className="font-semibold text-zinc-900">🟡 Заполните профиль</div>
              <p className="mt-1 text-sm text-zinc-700">
                Нужны ФИО и телефон, чтобы начать проверку участка.
              </p>
              <Link
                href="/onboarding"
                className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
              >
                Заполнить профиль
              </Link>
            </>
          ) : !hasPlots ? (
            <>
              <div className="font-semibold text-zinc-900">🟡 Добавьте участок</div>
              <p className="mt-1 text-sm text-zinc-700">
                Укажите кадастровый номер, чтобы начать проверку.
              </p>
              <Link
                href="/cabinet/plots/new"
                className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
              >
                Добавить участок
              </Link>
            </>
          ) : showSendVerification ? (
            <>
              <div className="font-semibold text-zinc-900">🟡 Отправьте на проверку</div>
              <p className="mt-1 text-sm text-zinc-700">
                Документы могут понадобиться по запросу правления.
              </p>
              <Link
                href="/cabinet/plots/new"
                className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
              >
                Отправить на проверку
              </Link>
              <Link
                href="/help#verification"
                className="mt-2 inline-flex text-xs text-zinc-500 hover:text-[#5E704F] hover:underline"
              >
                Как проходит проверка
              </Link>
            </>
          ) : status === "verified" ? (
            <>
              <div className="font-semibold text-emerald-700">✅ Доступ открыт</div>
              <p className="mt-1 text-sm text-emerald-800">
                Проверка пройдена, все разделы кабинета доступны.
              </p>
            </>
          ) : status === "pending" ? (
            <>
              <div className="font-semibold text-sky-700">⏳ На проверке (1–2 рабочих дня)</div>
              <p className="mt-1 text-sm text-sky-800">
                Мы проверяем документы. Если нужны уточнения, мы напишем здесь.
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                <Link href="/help#verification" className="hover:text-[#5E704F] hover:underline">
                  Как проходит проверка
                </Link>
                <Link href="/help" className="hover:text-[#5E704F] hover:underline">
                  Написать в правление
                </Link>
              </div>
            </>
          ) : status === "rejected" ? (
            <>
              <div className="font-semibold text-amber-700">❌ Нужны уточнения</div>
              {reviewNote ? (
                <p className="mt-1 text-sm text-amber-800">{reviewNote}</p>
              ) : (
                <p className="mt-1 text-sm text-amber-800">
                  Проверьте данные и отправьте заявку повторно.
                </p>
              )}
              <Link
                href="/cabinet/plots/new"
                className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
              >
                Исправить и отправить снова
              </Link>
              <Link
                href="/help"
                className="mt-2 inline-flex text-xs text-zinc-500 hover:text-[#5E704F] hover:underline"
              >
                Написать в правление
              </Link>
            </>
          ) : (
            <>
              <div className="font-semibold text-zinc-900">🟡 Проверка не начата</div>
              <p className="mt-1 text-sm text-zinc-700">
                Добавьте участок и документ, чтобы начать проверку.
              </p>
              <Link
                href="/cabinet/plots/new"
                className="mt-3 inline-flex rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white"
              >
                Подтвердить участок
              </Link>
              <Link
                href="/help#verification"
                className="mt-2 inline-flex text-xs text-zinc-500 hover:text-[#5E704F] hover:underline"
              >
                Как проходит проверка
              </Link>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-semibold text-[#5E704F] underline">
          <Link href="/cabinet">← Вернуться в кабинет</Link>
          <Link href="/">← На главную</Link>
        </div>
      </div>
    </main>
  );
}
