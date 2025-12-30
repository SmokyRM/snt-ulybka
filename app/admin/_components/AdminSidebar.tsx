"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminDirty } from "../AdminDirtyProvider";
import { useAdminNavigationProgress } from "../AdminNavigationProgress";

const SIDEBAR_COLLAPSED_KEY = "admin.sidebar.collapsed";
const SIDEBAR_SECTIONS_KEY = "admin.sidebar.sections";

const baseSections = [
  {
    title: "Управление данными",
    links: [
      { href: "/admin", label: "Дашборд" },
      {
        href: "/admin/plots",
        label: "Реестр участков",
        hint: "Список участков и владельцев",
      },
      {
        href: "/admin/imports/plots",
        label: "Импорт реестра",
        hint: "Загрузка файла для массового обновления",
      },
      {
        href: "/admin/analytics",
        label: "Проблемы и сводка",
        hint: "Пустые поля, неподтверждённые статусы, ошибки",
      },
    ],
  },
  {
    title: "Финансы",
    links: [
      {
        href: "/admin/billing",
        label: "Биллинг",
        hint: "Начисления по периодам и итоги",
      },
      {
        href: "/admin/tariffs",
        label: "Тарифы взносов",
        hint: "Настройка сумм взносов",
      },
      {
        href: "/admin/billing/import",
        label: "Импорт платежей",
        hint: "Загрузка платежей из CSV",
      },
      {
        href: "/admin/billing/imports",
        label: "Импорты платежей",
        hint: "Журнал импортов и ошибки",
      },
      {
        href: "/admin/notifications/debtors",
        label: "Должники",
        hint: "Уведомления и рассылка",
      },
      {
        href: "/admin/debts",
        label: "Долги",
        hint: "Долги по участкам и экспорт",
      },
    ],
  },
  {
    title: "Электроэнергия",
    links: [
      {
        href: "/admin/electricity/readings",
        label: "Показания",
        hint: "Ввод и контроль показаний",
      },
      {
        href: "/admin/electricity/tariffs",
        label: "Тарифы",
        hint: "Настройка тарифов и сроков",
      },
      {
        href: "/admin/electricity/report",
        label: "Отчёт по электро",
        hint: "Начисления и долги по периоду",
      },
    ],
  },
  {
    title: "Расходы и цели",
    links: [
      {
        href: "/admin/expenses",
        label: "Расходы",
        hint: "Учет и структура расходов",
      },
      {
        href: "/admin/targets",
        label: "Цели",
        hint: "Целевые сборы и прогресс",
      },
    ],
  },
  {
    title: "Настройки сайта",
    links: [
      {
        href: "/admin/public-content",
        label: "Публичные данные",
        hint: "Контакты, реквизиты, FAQ",
      },
    ],
  },
  {
    title: "Помощь",
    links: [
      {
        href: "/admin/help",
        label: "Помощь",
        hint: "Инструкция по работе",
      },
    ],
  },
];

type AdminSidebarProps = {
  isDev: boolean;
  isAdmin: boolean;
  role: "user" | "admin" | "board" | "accountant" | "operator";
};

export default function AdminSidebar({ isDev, isAdmin, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirmIfDirty } = useAdminDirty();
  const { isNavigating, start } = useAdminNavigationProgress();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    const isSmallScreen = window.innerWidth < 640;
    return storedCollapsed === "true" || (storedCollapsed === null && isSmallScreen);
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const storedSections = window.localStorage.getItem(SIDEBAR_SECTIONS_KEY);
    if (!storedSections) return {};
    try {
      return JSON.parse(storedSections) as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  const hasFinanceAccess = role === "admin" || role === "accountant" || role === "board";
  const hasMembershipTariffAccess = role === "admin" || role === "board";
  const hasImportAccess =
    role === "admin" || role === "accountant" || role === "operator" || role === "board";

  const sections = baseSections
    .map((section) => ({
      ...section,
      links: [...section.links],
    }))
    .map((section) => {
      if (section.title === "Управление данными") {
        return {
          ...section,
          links: section.links.filter((link) => {
            if (link.href === "/admin/plots") return isAdmin;
            if (link.href === "/admin/imports/plots") return hasImportAccess;
            return true;
          }),
        };
      }
      if (section.title === "Финансы") {
        return {
          ...section,
          links: section.links.filter((link) => {
            if (link.href === "/admin/tariffs") return hasMembershipTariffAccess;
            if (
              link.href === "/admin/billing" ||
              link.href === "/admin/billing/import" ||
              link.href === "/admin/billing/imports" ||
              link.href === "/admin/notifications/debtors" ||
              link.href === "/admin/debts"
            ) {
              return hasFinanceAccess || (hasImportAccess && link.href.includes("import"));
            }
            return true;
          }),
        };
      }
      if (section.title === "Настройки сайта") {
        return {
          ...section,
          links: section.links.filter(() => isAdmin),
        };
      }
      if (section.title === "Помощь") {
        return {
          ...section,
          links: section.links.filter(() => hasImportAccess || hasFinanceAccess),
        };
      }
      if (section.title === "Расходы и цели") {
        return {
          ...section,
          links: section.links.filter(() => isAdmin),
        };
      }
      return section;
    })
    .filter((section) => section.links.length > 0);

  if (isDev && isAdmin) {
    sections[0].links.push({
      href: "/admin/dev/seed",
      label: "Тестовые данные",
    });
  }

  const activeSectionTitle = useMemo(() => {
    const matched = sections.find((section) =>
      section.links.some((link) => pathname === link.href),
    );
    return matched?.title ?? null;
  }, [pathname, sections]);

  const visibleSections = useMemo(() => {
    if (!activeSectionTitle) return openSections;
    if (openSections[activeSectionTitle] !== false) return openSections;
    return { ...openSections, [activeSectionTitle]: true };
  }, [activeSectionTitle, openSections]);

  useEffect(() => {
    const prefetchTargets = [
      "/admin",
      "/admin/plots",
      "/admin/imports/plots",
      "/admin/analytics",
    ];
    if (isDev && isAdmin) {
      prefetchTargets.push("/admin/dev/seed");
    }
    prefetchTargets.forEach((href) => router.prefetch(href));
  }, [isAdmin, isDev, router]);

  if (isDev) {
    const seen = new Set<string>();
    sections.forEach((section) => {
      section.links.forEach((link) => {
        if (seen.has(link.href)) {
          console.error("[admin-nav] duplicate href detected:", link.href);
        }
        seen.add(link.href);
        if (link.label === "Дашборд" && link.href !== "/admin") {
          console.error("[admin-nav] invalid dashboard href:", link.href);
        }
      });
    });
  }

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      }
      return next;
    });
  };

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  return (
    <aside
      className={`flex flex-shrink-0 flex-col gap-2 border-r border-zinc-200 bg-white p-4 transition-all ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`text-sm font-semibold text-zinc-800 ${collapsed ? "sr-only" : ""}`}>
          Админ-меню
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>
      <nav className="flex flex-col gap-3 text-sm">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                if (collapsed) return;
                toggleSection(section.title);
              }}
              className={`flex items-center justify-between px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 ${
                collapsed ? "pointer-events-none sr-only" : ""
              }`}
            >
              <span>{section.title}</span>
              <span
                className={`text-xs transition-transform ${
                  visibleSections[section.title] === false ? "rotate-0" : "rotate-90"
                }`}
              >
                ▶
              </span>
            </button>
            {(collapsed || visibleSections[section.title] !== false) &&
              section.links.map((link) => {
              const rawHref = link.label === "Дашборд" ? "/admin" : link.href;
              const href = rawHref.startsWith("/") ? rawHref : `/${rawHref}`;
              if (process.env.NODE_ENV !== "production" && !rawHref.startsWith("/")) {
                console.warn("[admin-nav] non-absolute href detected:", rawHref);
              }
              const active = pathname === href;
              const hintText = link.hint ? `${link.label} — ${link.hint}` : link.label;
              return (
                <button
                  key={`${section.title}:${href}`}
                  type="button"
                  onClick={() => {
                    if (isNavigating) return;
                    confirmIfDirty(() => {
                      start();
                      router.push(href);
                    });
                  }}
                  onMouseEnter={() => router.prefetch(href)}
                  disabled={isNavigating}
                  title={collapsed ? hintText : link.label}
                  className={`rounded px-3 py-2 text-left transition ${
                    active
                      ? "bg-[#5E704F] text-white"
                      : "text-zinc-800 hover:bg-zinc-100"
                  } disabled:cursor-wait disabled:opacity-70 ${collapsed ? "px-2" : ""}`}
                >
                  <div className="text-sm font-semibold">{collapsed ? "•" : link.label}</div>
                  {!collapsed && link.hint ? (
                    <div
                      className={`text-[11px] ${
                        active ? "text-white/80" : "text-zinc-500"
                      }`}
                    >
                      {link.hint}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
