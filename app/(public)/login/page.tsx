import Link from "next/link";
import LoginForm from "./LoginForm";

type SearchParams = {
  next?: string | string[];
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await Promise.resolve(searchParams)) ?? {};
  const rawNext = Array.isArray(sp.next) ? sp.next[0] : sp.next;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <LoginForm nextParam={rawNext} />
        <div className="mt-6 space-y-2 text-sm text-zinc-500">
          <Link href="/" className="block hover:text-[#5E704F] hover:underline">
            ← На главную
          </Link>
          <Link href="/#get-access" className="block hover:text-[#5E704F] hover:underline">
            Нет кода или вы впервые? → Как получить доступ
          </Link>
          <Link href="/help" className="block hover:text-[#5E704F] hover:underline">
            Нужна помощь? → Справка
          </Link>
        </div>
      </div>
    </main>
  );
}
