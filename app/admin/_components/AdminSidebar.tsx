"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAdminDirty } from "../AdminDirtyProvider";

const sections = [
  {
    title: "Управление данными",
    links: [
      { href: "/admin", label: "Дашборд" },
      { href: "/admin/plots", label: "Реестр участков" },
      { href: "/admin/analytics", label: "Аналитика реестра" },
    ],
  },
  {
    title: "Финансы",
    links: [
      { href: "/admin/billing", label: "Биллинг" },
      { href: "/admin/billing/import", label: "Импорт платежей" },
      { href: "/admin/billing/imports", label: "Импорты" },
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

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { confirmIfDirty } = useAdminDirty();

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
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => confirmIfDirty(() => router.push(link.href))}
                  className={`rounded px-3 py-2 text-left transition ${
                    active
                      ? "bg-[#5E704F] text-white"
                      : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
