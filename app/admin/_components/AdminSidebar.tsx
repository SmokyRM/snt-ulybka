"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminDirty } from "../AdminDirtyProvider";
import { useAdminNavigationProgress } from "../AdminNavigationProgress";

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
      { href: "/admin/billing", label: "Биллинг" },
      { href: "/admin/billing/import", label: "Импорт платежей" },
      { href: "/admin/billing/imports", label: "Импорты платежей" },
      { href: "/admin/notifications/debtors", label: "Должники" },
      { href: "/admin/debts", label: "Долги" },
    ],
  },
  {
    title: "Электроэнергия",
    links: [
      { href: "/admin/electricity/readings", label: "Показания" },
      { href: "/admin/electricity/tariffs", label: "Тарифы" },
      { href: "/admin/electricity/report", label: "Отчёт по электро" },
    ],
  },
  {
    title: "Расходы и цели",
    links: [
      { href: "/admin/expenses", label: "Расходы" },
      { href: "/admin/targets", label: "Цели" },
    ],
  },
  {
    title: "Настройки сайта",
    links: [{ href: "/admin/public-content", label: "Публичные данные" }],
  },
];

type AdminSidebarProps = {
  isDev: boolean;
  isAdmin: boolean;
};

export default function AdminSidebar({ isDev, isAdmin }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { confirmIfDirty } = useAdminDirty();
  const { isNavigating, start } = useAdminNavigationProgress();

  const sections = baseSections.map((section) => ({
    ...section,
    links: [...section.links],
  }));

  if (isDev && isAdmin) {
    sections[0].links.push({
      href: "/admin/dev/seed",
      label: "Тестовые данные",
    });
  }

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

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col gap-2 border-r border-zinc-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-zinc-800">Админ-меню</div>
      <nav className="flex flex-col gap-3 text-sm">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <div className="px-2 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              {section.title}
            </div>
            {section.links.map((link) => {
              const rawHref = link.label === "Дашборд" ? "/admin" : link.href;
              const href = rawHref.startsWith("/") ? rawHref : `/${rawHref}`;
              if (process.env.NODE_ENV !== "production" && !rawHref.startsWith("/")) {
                console.warn("[admin-nav] non-absolute href detected:", rawHref);
              }
              const active = pathname === href;
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
                  className={`rounded px-3 py-2 text-left transition ${
                    active
                      ? "bg-[#5E704F] text-white"
                      : "text-zinc-800 hover:bg-zinc-100"
                  } disabled:cursor-wait disabled:opacity-70`}
                >
                  <div className="text-sm font-semibold">{link.label}</div>
                  {link.hint ? (
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
