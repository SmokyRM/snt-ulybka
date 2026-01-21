"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QaCabinetStage } from "@/lib/qaCabinetStage.shared";

type Props = {
  backHref?: string;
  nextHref?: string;
  exitHref: string;
  nextStage?: QaCabinetStage | "cabinet_home" | null;
  nextLabel?: string;
  backLabel?: string;
  disableNext?: boolean;
};

export function OnboardingActions({
  backHref,
  nextHref,
  exitHref,
  nextStage = null,
  nextLabel = "Далее",
  backLabel = "Назад",
  disableNext = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const updateStage = (stage: QaCabinetStage | "cabinet_home" | null) => {
    if (!stage) return;
    void fetch("/api/qa/cabinet-stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch(() => {});
  };

  const handleNext = () => {
    if (busy) return;
    setBusy(true);
    if (nextStage) {
      updateStage(nextStage);
    }
    const target = nextHref || "/cabinet";
    router.push(target);
    setTimeout(() => setBusy(false), 2000);
  };

  const handleExit = () => {
    if (busy) return;
    setBusy(true);
    router.push(exitHref);
    setTimeout(() => setBusy(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2">
        {backHref ? (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
            disabled={busy}
          >
            {backLabel}
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExit}
          disabled={busy}
          className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
        >
          Сохранить и выйти
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={busy || disableNext}
          className="rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4d5d41]"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
