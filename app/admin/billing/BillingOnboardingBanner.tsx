"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "onboarding.billing.completed";
const allowedRoles = new Set(["admin", "board", "accountant"]);

type BillingOnboardingBannerProps = {
  role: string | null | undefined;
};

export default function BillingOnboardingBanner({ role }: BillingOnboardingBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!role || !allowedRoles.has(role)) {
      setVisible(false);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setVisible(stored !== "true");
  }, [role]);

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-[#5E704F]/20 bg-[#F8F1E9] p-4 text-sm text-zinc-800">
      <div className="mb-2 text-base font-semibold">Как работать с биллингом</div>
      <ol className="list-decimal space-y-1 pl-4 text-zinc-700">
        <li>Создать период начислений</li>
        <li>Проверить начисления</li>
        <li>Импортировать платежи</li>
        <li>Контролировать долги</li>
      </ol>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "true");
          setVisible(false);
        }}
        className="mt-3 rounded border border-[#5E704F] px-3 py-1 text-sm text-[#5E704F] hover:bg-white"
      >
        Понятно, больше не показывать
      </button>
    </div>
  );
}

