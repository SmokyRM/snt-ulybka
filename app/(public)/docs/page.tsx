import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Документы СНТ «Улыбка»</h1>
          <p className="mt-3 text-sm text-zinc-700">
            В этом разделе будут размещаться устав, протоколы, решения общего собрания и
            официальные объявления товарищества.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Публикации</h2>
          <p className="mt-2 text-sm text-zinc-700">
            Публикации документов появятся здесь после загрузки. Следите за новостями СНТ.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full border border-[#5E704F] px-5 py-2 text-sm font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
          >
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}

