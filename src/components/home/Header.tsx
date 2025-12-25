"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Главная", href: "/" },
  { label: "Новости", href: "#news" },
  { label: "Документы", href: "#docs" },
  { label: "Электроэнергия", href: "/electricity" },
  { label: "Взносы", href: "/fees" },
  { label: "Обращения", href: "#appeal" },
  { label: "Контакты", href: "#contacts" },
  { label: "Кабинет", href: "/auth" },
];

export default function Header() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/")) return pathname.startsWith(href);
    return false;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#2F3827]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 text-white sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <img
            src="/brand/logo.svg"
            alt="Логотип СНТ «Улыбка»"
            className="h-10 w-auto"
          />
          <span className="text-base font-semibold">СНТ «Улыбка»</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-white/80 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-white ${
                isActive(item.href) ? "text-white" : ""
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="#pay"
          className="rounded-full border border-white/30 bg-white px-5 py-2 text-sm font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
        >
          Оплата
        </a>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-3 px-4 pb-3 text-xs font-medium text-white/80 lg:hidden sm:px-6">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`rounded-full border border-white/25 px-3 py-1 transition-colors hover:border-white hover:text-white ${
              isActive(item.href) ? "border-white text-white" : ""
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}
