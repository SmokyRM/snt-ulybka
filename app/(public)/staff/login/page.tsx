import { Suspense } from "react";
import Link from "next/link";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { getEffectiveSessionUser } from "@/lib/session.server";
import StaffLoginClient from "./StaffLoginClient";

export const metadata = {
  title: "Вход для сотрудников — СНТ «Улыбка»",
  alternates: { canonical: "/staff/login" },
};

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string | string[] }>;
}) {
  const params = (await Promise.resolve(searchParams)) ?? {};
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next ?? null;
  const sanitizedNext = sanitizeNextUrl(rawNext);
  const session = await getEffectiveSessionUser();

  if (session?.role === "resident") {
    return (
      <main
        className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6"
        data-testid="staff-login-resident"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        </div>
        <p className="text-sm text-zinc-600">
          Это вход для сотрудников. Для жителей используйте вход по коду доступа.
        </p>
        <Link
          href={sanitizedNext ? `/login?next=${encodeURIComponent(sanitizedNext)}` : "/login"}
          className="inline-flex w-fit rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d5d41]"
        >
          Перейти на вход для жителей
        </Link>
      </main>
    );
  }

  return (
    <Suspense fallback={
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        </div>
        <p className="text-sm text-zinc-600">Загрузка...</p>
      </main>
    }>
      <StaffLoginClient initialNext={sanitizedNext} />
    </Suspense>
  );
}
