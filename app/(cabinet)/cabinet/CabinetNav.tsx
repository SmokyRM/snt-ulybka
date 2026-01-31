"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/cabinet", label: "Главная" },
  { href: "/cabinet/payments", label: "Взносы" },
  { href: "/cabinet/balance", label: "Баланс" },
  { href: "/cabinet/receipts", label: "Квитанции" },
  { href: "/cabinet/power", label: "Электро" },
  { href: "/cabinet/appeals", label: "Обращения" },
  { href: "/cabinet/docs", label: "Документы" },
  { href: "/cabinet/notifications", label: "Уведомления" },
  { href: "/cabinet/help", label: "Помощь" },
];

export default function CabinetNav() {
  const pathname = usePathname();
  return (
    <div className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-3 sm:px-6">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                active
                  ? "rounded-full bg-[#5E704F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                  : "rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F]"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
