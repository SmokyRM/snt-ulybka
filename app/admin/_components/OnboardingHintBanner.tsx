"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const allowedRoles = new Set(["admin", "board", "accountant", "operator"]);

type OnboardingStep = {
  label: string;
  href?: string;
};

type OnboardingHintBannerProps = {
  role: string | null | undefined;
  storageKey: string;
  title: string;
  description?: string;
  steps: OnboardingStep[];
};

export default function OnboardingHintBanner({
  role,
  storageKey,
  title,
  description,
  steps,
}: OnboardingHintBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const visible = useMemo(() => {
    if (!role || !allowedRoles.has(role)) return false;
    if (dismissed) return false;
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) !== "true";
  }, [dismissed, role, storageKey]);

  if (!visible) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#5E704F]/20 bg-[#F8F1E9] p-4 text-sm text-zinc-800">
      <div className="mb-1 text-base font-semibold">{title}</div>
      {description ? <p className="mb-2 text-sm text-zinc-700">{description}</p> : null}
      <ol className="list-decimal space-y-1 pl-4 text-zinc-700">
        {steps.map((step) => (
          <li key={step.label}>
            {step.href ? (
              <Link href={step.href} className="text-[#5E704F] hover:underline">
                {step.label}
              </Link>
            ) : (
              step.label
            )}
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(storageKey, "true");
          setDismissed(true);
        }}
        className="mt-3 rounded border border-[#5E704F] px-3 py-1 text-sm text-[#5E704F] hover:bg-white"
      >
        Понятно, больше не показывать
      </button>
    </div>
  );
}
