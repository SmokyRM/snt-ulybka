"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type QaCabinetStage } from "@/lib/qaCabinetStage.shared";

export default function CabinetDevPanel({ currentStage }: { currentStage: QaCabinetStage | null }) {
  const router = useRouter();
  const [loadingStage, setLoadingStage] = useState<string | null>(null);

  const updateStage = async (stage: QaCabinetStage | null) => {
    setLoadingStage(stage ?? "none");
    try {
      await fetch("/api/qa/cabinet-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch {
      // ignore
    } finally {
      setLoadingStage(null);
      router.refresh();
    }
  };

  return (
    <div className="fixed right-4 top-4 z-50 rounded-xl border border-amber-300 bg-amber-50/95 px-4 py-3 text-xs text-amber-900 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Cabinet Lab</div>
        <span className="text-[11px] text-amber-800">stage: {currentStage ?? "real"}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateStage(null)}
          className="rounded-full border border-amber-500 px-3 py-1 font-semibold text-amber-900 transition hover:bg-amber-100"
          disabled={loadingStage === "none"}
          data-testid="qa-stage-btn-real"
        >
          Real
        </button>
        <button
          type="button"
          onClick={() => updateStage("profile")}
          className={`rounded-full border px-3 py-1 font-semibold transition ${
            currentStage === "profile"
              ? "border-amber-700 bg-amber-200 text-amber-900"
              : "border-amber-400 text-amber-800 hover:bg-amber-100"
          }`}
          disabled={loadingStage === "profile"}
          data-testid="qa-stage-btn-profile"
        >
          Profile
        </button>
        <button
          type="button"
          onClick={() => updateStage("cabinet_home")}
          className={`rounded-full border px-3 py-1 font-semibold transition ${
            currentStage === "cabinet_home"
              ? "border-amber-700 bg-amber-200 text-amber-900"
              : "border-amber-400 text-amber-800 hover:bg-amber-100"
          }`}
          disabled={loadingStage === "cabinet_home"}
          data-testid="qa-stage-btn-cabinet"
        >
          Cabinet
        </button>
      </div>
    </div>
  );
}
