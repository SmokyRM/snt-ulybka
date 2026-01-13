import Link from "next/link";

export const metadata = {
  title: "Нет доступа — СНТ «Улыбка»",
  alternates: { canonical: "/forbidden" },
};

export default function ForbiddenPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-10 text-zinc-900"
      data-testid="forbidden-root"
    >
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Нет доступа</h1>
        <p className="mt-2 text-sm text-zinc-600">
          У вас нет прав для просмотра этой страницы.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
