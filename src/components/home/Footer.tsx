export default function Footer() {
  return (
    <footer className="border-t border-[#5E704F]/15 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 text-sm text-zinc-600 sm:flex-row sm:items-center sm:px-6">
        <div className="text-zinc-900">
          <span className="font-semibold">СНТ «Улыбка»</span>
        </div>
        <div>© {new Date().getFullYear()} Официальный сайт СНТ</div>
      </div>
    </footer>
  );
}
