import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const updatedSource = buildTime ? new Date(buildTime) : null;
  const updatedLabel =
    updatedSource && !Number.isNaN(updatedSource.getTime())
      ? updatedSource.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";
  return (
    <footer className="border-t border-[#5E704F]/15 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-zinc-600 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="text-zinc-900">
              <span className="font-semibold">СНТ «Улыбка»</span>
            </div>
            <div className="text-xs text-zinc-600">
              © {year} Официальный сайт СНТ «Улыбка», г. Снежинск
            </div>
            <div className="text-xs text-zinc-600">Обновлено: {updatedLabel}</div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Портал
            </div>
            <div className="flex flex-col gap-2 text-sm text-zinc-700">
              <Link href="/about" className="text-[#5E704F] hover:underline">
                О портале
              </Link>
              <Link href="/access" className="text-[#5E704F] hover:underline">
                Как получить доступ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
