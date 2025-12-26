"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";

export type SectionKey =
  | "home"
  | "finance"
  | "electricity"
  | "charges"
  | "appeals"
  | "docs"
  | "events";

type Section = {
  key: SectionKey;
  title: string;
  content: React.ReactNode;
};

type Props = {
  sections: Section[];
  unreadCount: number;
  quickActions?: Array<{ key: SectionKey; title: string; desc?: string; targetId?: string }>;
};

export function CabinetShell({ sections, unreadCount, quickActions = [] }: Props) {
  const [active, setActive] = useState<SectionKey>("home");
  const activeContent = sections.find((s) => s.key === active)?.content;

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Личный кабинет</h1>
            <div className="text-xs text-zinc-600">Уведомления: {unreadCount > 0 ? `${unreadCount} новых` : "нет новых"}</div>
          </div>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
            busyLabel="Выходим..."
          />
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className={
                active === s.key
                  ? "flex-1 rounded-full bg-[#5E704F] px-4 py-2 text-xs font-semibold text-white transition-colors sm:flex-none"
                  : "flex-1 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:border-zinc-400 sm:flex-none"
              }
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">{activeContent}</div>

        {active === "home" && quickActions.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Быстрые действия</h2>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {quickActions.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => {
                    setActive(card.key);
                    const targetId = card.targetId || `${card.key}-section`;
                    setTimeout(() => {
                      const el = document.getElementById(targetId);
                      el?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }}
                  className="flex flex-col rounded-xl border border-[#5E704F]/30 bg-[#5E704F]/5 px-3 py-3 text-left text-sm font-semibold text-[#2F3827] transition-colors hover:border-[#5E704F]/60"
                >
                  <span>{card.title}</span>
                  {card.desc && <span className="text-xs font-normal text-zinc-700">{card.desc}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
