"use client";

import { useEffect, useState } from "react";
import { qaEnabled, QA_COOKIE, type QaScenario } from "@/lib/qaScenario";

const allowed: QaScenario[] = ["guest", "resident_ok", "resident_debtor", "admin"];

const readScenario = (): QaScenario | null => {
  const raw = typeof document !== "undefined" ? document.cookie : "";
  if (!raw) return null;
  const value = raw
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${QA_COOKIE}=`))
    ?.split("=")[1];
  if (value && allowed.includes(value as QaScenario)) return value as QaScenario;
  return null;
};

type Props = {
  role?: "admin" | "board" | "chair" | "accountant" | "operator" | "user" | null;
};

export default function QaFloatingIndicator({ role }: Props) {
  const [scenario, setScenario] = useState<QaScenario | null>(null);

  useEffect(() => {
    if (!qaEnabled()) return;
    const update = () => setScenario(readScenario());
    update();
    const onFocus = () => update();
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!qaEnabled()) return null;
  if (!scenario) return null;
  const allowedRole =
    role === "admin" || role === "board" || role === "chair" || role === "accountant" || role === "operator";
  if (!allowedRole && role) return null;
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) {
    return null;
  }

  const handleClear = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("qa", "none");
    window.location.assign(url.toString());
  };

  return (
    <div className="fixed bottom-4 left-4 z-[1200]">
      <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 shadow-md">
        <span>QA: {scenario}</span>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-full border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          Сбросить
        </button>
        <a
          href="/admin/qa"
          className="rounded-full border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
        >
          QA
        </a>
      </div>
    </div>
  );
}
