"use client";

import { useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import type { SectionKey } from "@/lib/cabinetRoutes";

export type { SectionKey };

type Section = {
  key: SectionKey;
  title: string;
  content: React.ReactNode;
};

type Props = {
  sections: Section[];
  unreadCount: number;
  quickActions?: Array<{ key: SectionKey; title: string; desc?: string; targetId?: string }>;
  initialActive?: SectionKey;
  isImpersonating?: boolean;
};

export function CabinetShell({
  sections,
  unreadCount,
  quickActions = [],
  initialActive = "home",
  isImpersonating = false,
}: Props) {
  const [active, setActive] = useState<SectionKey>(initialActive);
  const activeContent = sections.find((s) => s.key === active)?.content;
  const activeTitle = sections.find((s) => s.key === active)?.title ?? "Секция";

  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">Мой кабинет</h1>
              {isImpersonating && (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                  Режим теста
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-600">
              Информация по вашему участку и начислениям
            </div>
          </div>
          <LogoutButton
            redirectTo="/"
            className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60"
            busyLabel="Выходим..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex sm:flex-wrap">
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

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">{activeTitle}</h2>
            {active !== "home" && (
              <button
                type="button"
                onClick={() => setActive("home")}
                className="text-xs font-semibold text-[#5E704F] underline"
              >
                ← Домой (ЛК)
              </button>
            )}
          </div>
          {activeContent}
        </div>

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
