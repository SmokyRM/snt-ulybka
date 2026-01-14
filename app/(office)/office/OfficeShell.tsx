"use client";

import AppLink from "@/components/AppLink";
import type { Role } from "@/lib/permissions";
import GlobalLogoutButton from "../../_components/GlobalLogoutButton";

type NavItem = { label: string; href: string; capability: string; testId?: string };

type Props = {
  role: Role;
  roleLabel: string;
  navItems: NavItem[];
  children: React.ReactNode;
  hasQa?: boolean;
};

export default function OfficeShell({ role, roleLabel, navItems, children, hasQa = false }: Props) {
  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Офис</div>
            <div className="text-sm font-semibold text-zinc-900" data-testid="role-indicator">
              Роль: {roleLabel}
              {hasQa ? " (QA)" : ""}
            </div>
            <div className="text-xs text-zinc-500">Рабочие разделы правления и бухгалтерии</div>
          </div>
          <div className="flex items-center gap-2">
            <AppLink
              href="/cabinet"
              data-testid="office-to-cabinet"
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-[#5E704F] transition hover:border-[#5E704F]"
            >
              Кабинет жителя (как видят жители)
            </AppLink>
            <GlobalLogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl gap-6 px-4 pb-10 pt-8 sm:px-6">
        <aside className="w-64 shrink-0 space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="space-y-1 text-sm" data-testid="office-nav">
            {navItems.map((item) => (
              <AppLink
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className="block rounded-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-50"
              >
                {item.label}
              </AppLink>
            ))}
            {!navItems.length ? (
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">Нет доступных разделов</div>
            ) : null}
          </div>
        </aside>
        <div className="flex-1 min-h-0">{children}</div>
      </main>
    </div>
  );
}
