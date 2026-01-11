"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import AppLink from "@/components/AppLink";
import { siteCity, siteName } from "@/config/site";
import { createPortal } from "react-dom";

type HeaderClientProps = {
  role?: "user" | "admin" | "board" | "accountant" | "operator" | null;
  onboardingStatus?: "complete" | "draft" | "pending" | "rejected" | null;
  verificationStatus?: "draft" | "pending" | "rejected" | "verified" | null;
};

const navItems = [
  { label: "База знаний", href: "/knowledge" },
  { label: "Документы", href: "/documents" },
  { label: "Электроэнергия", href: "/electricity" },
  { label: "Взносы", href: "/fees" },
  { label: "Контакты", href: "/contacts" },
  { label: "Помощь", href: "/help" },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountWrapRef = useRef<HTMLDivElement | null>(null);
  const accountButtonRef = useRef<HTMLButtonElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const repositionRafRef = useRef<number | null>(null);
  const [accountMenuPos, setAccountMenuPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const mounted = typeof document !== "undefined";
  const accountMenuId = useId();
  const accountButtonId = useId();
  const needsOnboarding = isAuthenticated && onboardingStatus && onboardingStatus !== "complete";
  const statusKey =
    verificationStatus && verificationStatus !== "verified"
      ? verificationStatus
      : verificationStatus === "verified"
        ? "verified"
        : needsOnboarding
          ? "draft"
          : null;
  const statusBadge = (() => {
    if (!isAuthenticated) return null;
    if (verificationStatus === "pending") {
      return { label: "⏳ Проверка", title: "Проверка данных участка", href: "/cabinet/verification" };
    }
    if (verificationStatus === "rejected") {
      return { label: "❌ Исправить", title: "Нужны уточнения по проверке", href: "/cabinet/verification" };
    }
    if (verificationStatus === "draft") {
      return { label: "🟡 Не завершено", title: "Регистрация не завершена", href: "/cabinet/verification" };
    }
    if (needsOnboarding) {
      return { label: "🟡 Не завершено", title: "Регистрация не завершена", href: "/cabinet/verification" };
    }
    return null;
  })();
  const statusTitle =
    statusBadge?.title ??
    (verificationStatus === "verified"
      ? "Доступ открыт"
      : needsOnboarding
        ? "Регистрация не завершена"
        : null);

  const updateAccountMenuPosition = useCallback(() => {
    if (!accountButtonRef.current) return;
    const rect = accountButtonRef.current.getBoundingClientRect();
    const menuWidth = accountMenuRef.current?.offsetWidth ?? 240;
    const menuHeight = accountMenuRef.current?.offsetHeight ?? 220;
    const viewportPadding = 12;
    const left = clamp(
      rect.right - menuWidth,
      viewportPadding,
      window.innerWidth - viewportPadding - menuWidth,
    );
    const preferDownTop = rect.bottom + 8;
    const openUpTop = rect.top - 8 - menuHeight;
    const top =
      preferDownTop + menuHeight > window.innerHeight - viewportPadding
        ? Math.max(viewportPadding, openUpTop)
        : preferDownTop;
    setAccountMenuPos({ top, left });
  }, []);

  const handleReposition = useCallback(() => {
    if (repositionRafRef.current !== null) return;
    repositionRafRef.current = window.requestAnimationFrame(() => {
      repositionRafRef.current = null;
      updateAccountMenuPosition();
    });
  }, [updateAccountMenuPosition]);

  useEffect(() => {
    if (!accountOpen) return;
    updateAccountMenuPosition();
    window.requestAnimationFrame(() => updateAccountMenuPosition());
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (accountWrapRef.current?.contains(target)) return;
      if (accountMenuRef.current?.contains(target)) return;
      setAccountOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      if (repositionRafRef.current !== null) {
        window.cancelAnimationFrame(repositionRafRef.current);
        repositionRafRef.current = null;
      }
    };
  }, [accountOpen, handleReposition, updateAccountMenuPosition]);

  const action = () => {
    if (isAuthenticated) {
      return (
        <div className="flex flex-shrink-0 flex-nowrap items-center gap-2" ref={accountWrapRef}>
          <div>
            <button
              type="button"
              onClick={() => setAccountOpen((prev) => !prev)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label="Аккаунт"
              aria-controls={accountMenuId}
              id={accountButtonId}
              ref={accountButtonRef}
              title={statusTitle ? `Статус: ${statusTitle}` : undefined}
              className="flex items-center gap-2 rounded-full border border-white/30 bg-white px-3 py-2 text-xs font-semibold text-[#2F3827] transition-colors hover:bg-white/90"
            >
              <span className="text-base">👤</span>
              <span className="hidden text-xs sm:inline">Аккаунт</span>
              <span className="text-xs">▾</span>
              {statusKey ? (
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ring-2 ring-white/60 ${
                    statusKey === "verified"
                      ? "bg-emerald-500"
                      : statusKey === "pending"
                        ? "bg-sky-500"
                        : statusKey === "rejected"
                          ? "bg-rose-500"
                          : "bg-amber-500"
                  }`}
                />
              ) : null}
            </button>
          </div>
          {accountOpen && mounted
            ? createPortal(
                <div
                  id={accountMenuId}
                  role="menu"
                  ref={accountMenuRef}
                  aria-labelledby={accountButtonId}
                  style={{ position: "fixed", top: accountMenuPos.top, left: accountMenuPos.left }}
                  className="z-[1000] min-w-[220px] max-w-[280px] rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-800 shadow-lg"
                >
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Аккаунт
                  </div>
                  <div className="px-3 pb-2 text-xs text-zinc-500">
                    <div className="flex items-center justify-between gap-2">
                      <span>Вы вошли как</span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                        {role === "admin"
                          ? "Администратор"
                          : role === "board"
                            ? "Правление"
                            : role === "user"
                              ? "Житель"
                              : "Пользователь"}
                      </span>
                    </div>
                  </div>
                  <hr className="my-2 border-zinc-100" />
                  <div className="mt-1 flex flex-col">
                    {statusBadge ? (
                      <AppLink
                        href={statusBadge.href}
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                      >
                        Статус: {statusBadge.label}
                      </AppLink>
                    ) : null}
                    <AppLink
                      href="/cabinet"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                    >
                      Личный кабинет
                    </AppLink>
                    {isAdmin && pathname.startsWith("/cabinet") ? (
                      <AppLink
                        href="/admin"
                        role="menuitem"
                        onClick={() => setAccountOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                      >
                        В админку
                      </AppLink>
                    ) : null}
                  </div>
                  <hr className="my-2 border-zinc-100" />
                  <div className="px-2 pb-1" role="menuitem">
                    <LogoutButton
                      redirectTo="/"
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-50"
                      busyLabel="Выходим..."
                      onAfterLogout={() => setAccountOpen(false)}
                    />
                  </div>
                </div>,
                document.body,
              )
            : null}
        </div>
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
        <div className="flex flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              setMenuOpen((prev) => !prev);
            }}
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
              <div className="pt-2">{action()}</div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
