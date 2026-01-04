"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import AppLink from "@/components/AppLink";
import { siteCity, siteName } from "@/config/site";

type HeaderClientProps = {
  role?: "user" | "admin" | "board" | "accountant" | "operator" | null;
  onboardingStatus?: "complete" | "draft" | "pending" | "rejected" | null;
  verificationStatus?: "draft" | "pending" | "rejected" | "verified" | null;
};

const navItems = [
  { label: "Новости", href: "/news" },
  { label: "Документы", href: "/documents" },
  { label: "Электроэнергия", href: "/electricity" },
  { label: "Взносы", href: "/fees" },
  { label: "Контакты", href: "/contacts" },
  { label: "Помощь", href: "/help" },
];

const isActive = (pathname: string, href: string) => {
  if (href === "/") return pathname === "/";
  if (href.startsWith("/")) return pathname.startsWith(href);
  return false;
};

export function HeaderClient({
  role,
  onboardingStatus = null,
  verificationStatus = null,
}: HeaderClientProps) {
  const pathname = usePathname();
  const isAdmin = role === "admin";
  const isAuthenticated = Boolean(role);
  const [menuOpen, setMenuOpen] = useState(false);
  const needsOnboarding = isAuthenticated && onboardingStatus && onboardingStatus !== "complete";
  const badge = (() => {
    if (!isAuthenticated) return null;
    if (verificationStatus === "rejected") {
      return { label: "❌ Нужны уточнения · Исправить", href: "/cabinet/verification" };
    }
    if (verificationStatus === "pending") {
      return { label: "⏳ На проверке (1–2 дня)", href: "/cabinet/verification" };
    }
    if (verificationStatus === "draft") {
      return { label: "🟡 Регистрация не завершена · Продолжить", href: "/cabinet/verification" };
    }
    if (needsOnboarding) {
      if (onboardingStatus === "pending") {
        return { label: "⏳ На проверке", href: "/onboarding" };
      }
      if (onboardingStatus === "rejected") {
        return { label: "❌ Нужно исправить · Продолжить", href: "/onboarding" };
      }
      return { label: "🟡 Профиль не завершён · Продолжить", href: "/onboarding" };
    }
    return null;
  })();

  const action = () => {
    if (isAdmin) {
      return (
        <div className="flex flex-shrink-0 items-center gap-2">
          <AppLink
            href="/admin"
            className="flex items-center gap-2 rounded-full border border-white/30 bg-white px-4 py-2 text-xs font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
          >
            В админку
          </AppLink>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-70"
            busyLabel="Выходим..."
          />
        </div>
      );
    }
    if (isAuthenticated) {
      return (
        <LogoutButton
          redirectTo="/"
          className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition-colors hover:border-white disabled:cursor-not-allowed disabled:opacity-70"
          busyLabel="Выходим..."
        />
      );
    }
    return (
      <AppLink
        href="/login"
        className="flex-shrink-0 rounded-full border border-white/30 bg-white px-5 py-2 text-sm font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
      >
        Войти
      </AppLink>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#2F3827]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 overflow-x-hidden px-4 py-4 text-white sm:px-6">
        <AppLink href="/" className="flex flex-shrink-0 items-center gap-3 text-white">
          <Image
            src="/brand/logo.svg"
            alt="Логотип СНТ «Улыбка»"
            width={44}
            height={44}
            className="h-10 w-auto"
            priority
          />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold">{siteName}</span>
            <span className="text-[11px] font-medium text-white/70">{siteCity}</span>
          </span>
        </AppLink>
        <nav className="hidden flex-1 items-center gap-5 text-sm font-medium text-white/80 lg:flex">
          {navItems.map((item) => (
            <AppLink
              key={item.href}
              href={item.href}
              className={`transition-colors hover:text-white ${
                isActive(pathname, item.href) ? "text-white" : ""
              }`}
            >
              {item.label}
            </AppLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {badge ? (
            <AppLink
              href={badge.href}
              className="hidden text-xs text-zinc-500 transition hover:text-white hover:underline sm:inline-flex"
            >
              {badge.label}
            </AppLink>
          ) : null}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex-shrink-0 rounded-full border border-white/30 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-white lg:hidden"
          >
            Меню
          </button>
          <div className="hidden lg:block">{action()}</div>
        </div>
      </div>
      {!menuOpen ? null : (
        <div className="mx-auto w-full max-w-6xl px-4 pb-3 text-sm text-white sm:px-6 lg:hidden">
          <div className="rounded-2xl border border-white/20 bg-[#2F3827]/95 p-4 shadow-lg">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <AppLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg px-3 py-2 transition-colors hover:bg-white/10 ${
                    isActive(pathname, item.href) ? "bg-white/10 text-white" : "text-white/80"
                  }`}
                >
                  {item.label}
                </AppLink>
              ))}
              {badge ? (
                <AppLink
                  href={badge.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
                >
                  {badge.label}
                </AppLink>
              ) : null}
              <div className="pt-2">{action()}</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
