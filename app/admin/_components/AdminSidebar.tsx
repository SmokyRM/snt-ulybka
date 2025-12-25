"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/plots", label: "Реестр участков" },
  { href: "/admin/billing", label: "Биллинг" },
  { href: "/admin/billing/import", label: "Импорт платежей" },
  { href: "/admin/billing/imports", label: "Импорты" },
  { href: "/admin/electricity/readings", label: "Показания" },
  { href: "/admin/electricity/tariffs", label: "Тарифы" },
  { href: "/admin/electricity/report", label: "Отчёт по электро" },
  { href: "/admin/notifications/debtors", label: "Должники" },
  { href: "/admin/debts", label: "Долги" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col gap-2 border-r border-zinc-200 bg-white p-4">
      <div className="mb-4 text-sm font-semibold text-zinc-800">Админ-меню</div>
      <nav className="flex flex-col gap-1 text-sm">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-3 py-2 transition ${
                active
                  ? "bg-[#5E704F] text-white"
                  : "text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
