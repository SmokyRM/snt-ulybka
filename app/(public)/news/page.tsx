import Link from "next/link";

export const metadata = {
  title: "Новости — СНТ «Улыбка»",
  alternates: {
    canonical: "/news",
  },
};

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Новости</h1>
          <p className="text-sm text-zinc-700">
            Раздел в разработке. Здесь скоро появится информация.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-zinc-600 transition hover:text-[#5E704F]">
              ← На главную
            </Link>
            <Link href="/help" className="text-zinc-600 transition hover:text-[#5E704F]">
              Справка
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
