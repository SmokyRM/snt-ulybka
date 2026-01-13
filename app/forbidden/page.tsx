import Link from "next/link";
<<<<<<< HEAD
import { getEffectiveSessionUser } from "@/lib/session.server";
import { sanitizeNext } from "@/lib/sanitizeNext";
import ForbiddenQaResetButton from "./ForbiddenQaResetButton";

export const dynamic = "force-dynamic";
=======
>>>>>>> 737c5be (codex snapshot)

export const metadata = {
  title: "Нет доступа — СНТ «Улыбка»",
  alternates: { canonical: "/forbidden" },
};

<<<<<<< HEAD
const getReasonText = (reason: string | null | undefined, role: string | null | undefined): string | null => {
  if (reason) {
    const reasons: Record<string, string> = {
      "admin.resident": "Эта страница доступна только администраторам. Жители не могут получить доступ к админ-панели.",
      "admin.staff": "Эта страница доступна только администраторам. Сотрудники офиса не могут получить доступ к админ-панели.",
      "admin.unknown": "Эта страница доступна только администраторам.",
      "office.resident": "Эта страница доступна только сотрудникам офиса. Жители не могут получить доступ к офису.",
      "office.unknown": "Эта страница доступна только сотрудникам офиса.",
      "cabinet.staff": "Эта страница доступна только жителям. Сотрудники офиса не могут получить доступ к кабинету жителя.",
      "cabinet.unknown": "Эта страница доступна только жителям.",
      "permission.denied": "У вас нет прав для выполнения этого действия.",
      role: "Ваша роль не позволяет получить доступ к этой странице.",
      session: "Требуется авторизация для доступа к этой странице.",
      permission: "У вас нет прав для выполнения этого действия.",
    };
    return reasons[reason] || null;
  }
  if (role) {
    if (role === "resident" || role === "user") {
      return "Эта страница доступна только сотрудникам офиса.";
    }
    if (role === "chairman" || role === "accountant" || role === "secretary") {
      return "Эта страница доступна только администраторам.";
    }
  }
  return null;
};

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getEffectiveSessionUser();
  const role = user?.role ?? null;
  const resolvedParams = (await searchParams) ?? {};
  const reasonParam = typeof resolvedParams.reason === "string" ? resolvedParams.reason : null;
  const nextParam = typeof resolvedParams.next === "string" ? resolvedParams.next : null;
  const sanitizedNext = sanitizeNext(nextParam);
  const reasonText = getReasonText(reasonParam, role);
  const isDev = process.env.NODE_ENV !== "production";

=======
export default function ForbiddenPage() {
>>>>>>> 737c5be (codex snapshot)
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-10 text-zinc-900"
      data-testid="forbidden-root"
    >
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Нет доступа</h1>
<<<<<<< HEAD
        {reasonText ? (
          <p className="mt-2 text-sm text-zinc-600">{reasonText}</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">У вас нет прав для просмотра этой страницы.</p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            data-testid="forbidden-cta-home"
            className="inline-flex items-center justify-center rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
          >
            На главную
          </Link>
          <Link
            href="/staff-login"
            data-testid="forbidden-cta-staff-login"
            className="inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F]/10"
          >
            Войти сотрудником
          </Link>
          <Link
            href="/login"
            data-testid="forbidden-cta-resident-login"
            className="inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F]/10"
          >
            Войти жителем
          </Link>
          <Link
            href="/access"
            data-testid="forbidden-cta-request-access"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
          >
            Запросить доступ
          </Link>
          {isDev ? (
            <div className="mt-2">
              <ForbiddenQaResetButton />
            </div>
          ) : null}
        </div>
=======
        <p className="mt-2 text-sm text-zinc-600">
          У вас нет прав для просмотра этой страницы.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
        >
          На главную
        </Link>
>>>>>>> 737c5be (codex snapshot)
      </div>
    </main>
  );
}
