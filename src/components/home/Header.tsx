const navItems = [
  { label: "Новости", href: "#news" },
  { label: "Документы", href: "#docs" },
  { label: "Электроэнергия", href: "#power" },
  { label: "Взносы", href: "#fees" },
  { label: "Обращения", href: "#appeal" },
  { label: "Контакты", href: "#contacts" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#5E704F]/15 bg-[#F8F1E9]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <a href="#" className="flex items-center gap-3">
          <img
            src="/brand/logo.svg"
            alt="Логотип СНТ «Улыбка»"
            className="h-10 w-auto"
          />
          <span className="text-base font-semibold text-zinc-900">
            СНТ «Улыбка»
          </span>
        </a>
        <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-800 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-[#5E704F]"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#pay"
          className="rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]"
        >
          Оплата
        </a>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-3 px-4 pb-3 text-xs font-medium text-zinc-700 lg:hidden sm:px-6">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-[#5E704F]/30 px-3 py-1 transition-colors hover:border-[#5E704F] hover:text-[#5E704F]"
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}
