"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";

type HeaderClientProps = {
  role?: "user" | "admin" | "board" | null;
};

const navItems = [
  { label: "Главная", href: "/" },
  { label: "Новости", href: "#news" },
  { label: "Документы", href: "#docs" },
  { label: "Электроэнергия", href: "/electricity" },
  { label: "Взносы", href: "/fees" },
  { label: "Обращения", href: "#appeal" },
  { label: "Контакты", href: "#contacts" },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/")) return pathname.startsWith(href);
  return false;
};

export function HeaderClient({ role }: HeaderClientProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const isUser = role === "user" || role === "board";

  const action = () => {
    if (isAdmin) {
      return (
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white px-4 py-2 text-xs font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
          >
            Админка
            <span className="rounded-full bg-[#2F3827]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#2F3827]">
              admin
            </span>
          </Link>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-70"
            busyLabel="Выходим..."
          />
        </div>
      );
    }
    if (isUser) {
      return (
        <div className="flex items-center gap-2">
          <Link
            href="/cabinet"
            className="rounded-full border border-white/30 bg-white px-4 py-2 text-xs font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
          >
            Кабинет
          </Link>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-70"
            busyLabel="Выходим..."
          />
        </div>
      );
    }
    return (
      <Link
        href="/login"
        className="rounded-full border border-white/30 bg-white px-5 py-2 text-sm font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
      >
        Войти
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#2F3827]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 text-white sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image
            src="/brand/logo.svg"
            alt="Логотип СНТ «Улыбка»"
            width={44}
            height={44}
            className="h-10 w-auto"
            priority
          />
          <span className="text-base font-semibold">СНТ «Улыбка»</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium text-white/80 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-white ${
                isActive(pathname, item.href) ? "text-white" : ""
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {action()}
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-3 px-4 pb-3 text-xs font-medium text-white/80 lg:hidden sm:px-6">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`rounded-full border border-white/25 px-3 py-1 transition-colors hover:border-white hover:text-white ${
              isActive(pathname, item.href) ? "border-white text-white" : ""
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}
