"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role } from "@/lib/permissions";
import { hasPermission } from "@/lib/rbac";

type Command = {
  key: string;
  label: string;
  keywords?: string;
  action: () => void;
  testId?: string;
};

type Props = {
  role: Role;
};

export default function OfficeCommandPalette({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const items: Command[] = [
      {
        key: "appeals-new",
        label: "Новые обращения",
        keywords: "appeals обращения new",
        action: () => router.push("/office/appeals?status=new"),
        testId: "office-cmdk-item-appeals-new",
      },
      {
        key: "appeals-overdue",
        label: "Просроченные обращения",
        keywords: "appeals overdue просроченные",
        action: () => router.push("/office/appeals?overdue=1"),
        testId: "office-cmdk-item-appeals-overdue",
      },
      {
        key: "registry-search",
        label: "Реестр: поиск…",
        keywords: "registry реестр поиск",
        action: () => router.push(`/office/registry?q=${encodeURIComponent(query || "")}`),
        testId: "office-cmdk-item-registry",
      },
      {
        key: "ann-new",
        label: "Создать объявление",
        keywords: "announcements объявления new",
        action: () => router.push("/office/announcements/new"),
        testId: "office-cmdk-item-announcement",
      },
      {
        key: "finance-debt",
        label: "Финансы: топ долгов",
        keywords: "finance финансы долги",
        action: () => router.push("/office/billing"),
        testId: "office-cmdk-item-finance",
      },
      {
        key: "dashboard",
        label: "Открыть дашборд",
        keywords: "dashboard дашборд",
        action: () => router.push("/office/dashboard"),
        testId: "office-cmdk-item-dashboard",
      },
    ];
    return items.filter((item) => {
      if (item.key.startsWith("finance") && !hasPermission(role, "finance.view")) return false;
      if (item.key.startsWith("ann") && !hasPermission(role, "announcements.manage")) return false;
      return true;
    });
  }, [query, role, router]);

  const filtered = commands.filter((cmd) => {
    if (!query) return true;
    const haystack = `${cmd.label} ${cmd.keywords ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-[#5E704F]"
        data-testid="office-cmdk-open"
      >
        Ctrl+K
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-10 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          data-testid="office-cmdk-modal"
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Быстрые действия..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 outline-none focus:border-[#5E704F]"
              data-testid="office-cmdk-input"
            />
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Ничего не найдено</div>
              ) : (
                filtered.map((cmd) => (
                  <button
                    key={cmd.key}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      cmd.action();
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-800 transition hover:border-[#5E704F] hover:bg-[#5E704F]/5"
                    data-testid={cmd.testId}
                  >
                    <span>{cmd.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
