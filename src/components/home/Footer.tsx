export default function Footer() {
  const year = new Date().getFullYear();
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const updatedSource = buildTime ? new Date(buildTime) : new Date();
  const updatedLabel = Number.isNaN(updatedSource.getTime())
    ? "—"
    : updatedSource.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  return (
    <footer className="border-t border-[#5E704F]/15 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-zinc-600 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="text-zinc-900">
            <span className="font-semibold">СНТ «Улыбка»</span>
          </div>
          <div className="flex flex-col items-start gap-1 text-xs text-zinc-600 sm:items-end">
            <span>
              © {year} Официальный сайт СНТ «Улыбка», г. Снежинск
            </span>
            <span>Обновлено: {updatedLabel}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
