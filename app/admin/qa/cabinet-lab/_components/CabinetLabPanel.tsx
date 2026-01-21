"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { mapQaStageToPath, type QaCabinetStage } from "@/lib/qaCabinetStage.shared";
import { CABINET_LAB_STAGES } from "../stages";

type Props = {
  currentStage: QaCabinetStage | null;
  mocksEnabled: boolean;
};

export default function CabinetLabPanel({ currentStage, mocksEnabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [mockBusy, setMockBusy] = useState(false);

  const currentIndex = useMemo(
    () => (currentStage ? CABINET_LAB_STAGES.indexOf(currentStage) : -1),
    [currentStage],
  );

  const sendStage = async (stage: QaCabinetStage | null) => {
    setLoading(stage ?? "real");
    try {
      await fetch("/api/qa/cabinet-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch {
      // ignore
    } finally {
      setLoading(null);
      router.refresh();
    }
  };

  const sendMockToggle = async (enabled: boolean) => {
    setMockBusy(true);
    try {
      await fetch("/api/qa/cabinet-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
    } catch {
      // ignore
    } finally {
      setMockBusy(false);
      router.refresh();
    }
  };

  const nextStage = () => {
    const next =
      currentIndex === -1
        ? CABINET_LAB_STAGES[0]
        : CABINET_LAB_STAGES[(currentIndex + 1) % CABINET_LAB_STAGES.length];
    sendStage(next);
  };

  const prevStage = () => {
    const prev =
      currentIndex === -1
        ? CABINET_LAB_STAGES[CABINET_LAB_STAGES.length - 1]
        : CABINET_LAB_STAGES[(currentIndex - 1 + CABINET_LAB_STAGES.length) % CABINET_LAB_STAGES.length];
    sendStage(prev);
  };

  const cabinetUrl = "/cabinet";
  const currentScreenUrl = currentStage ? (mapQaStageToPath(currentStage) ?? cabinetUrl) : cabinetUrl;

  const openCabinet = () => {
    window.open(cabinetUrl, "_blank", "noopener,noreferrer");
  };

  const openCurrentStage = () => {
    window.open(currentScreenUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold">Cabinet Lab</div>
        <div className="flex items-center gap-2 text-[11px] text-amber-800">
          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 font-semibold">
            {currentStage ?? "real"}
          </span>
          <button
            type="button"
            onClick={() => sendStage(null)}
            disabled={loading === "real"}
            className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            data-testid="cabinet-lab-reset"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col items-start gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCabinet();
            }}
            className="rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:border-amber-500"
          >
            Открыть кабинет
          </button>
          <span className="text-[10px] text-amber-700">Откроется: {cabinetUrl}</span>
        </div>
        <div className="flex flex-col items-start gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openCurrentStage();
            }}
            className="rounded-full border border-amber-500 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:border-amber-600"
          >
            Открыть текущий экран
          </button>
          <span className="text-[10px] text-amber-700">Откроется: {currentScreenUrl}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {CABINET_LAB_STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => sendStage(stage)}
            disabled={loading === stage}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              currentStage === stage
                ? "border-amber-700 bg-amber-200 text-amber-900"
                : "border-amber-400 text-amber-800 hover:bg-amber-100"
            }`}
            data-testid={`cabinet-lab-stage-${stage}`}
          >
            {stage}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={prevStage}
          className="flex-1 rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          data-testid="cabinet-lab-prev"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={nextStage}
          className="flex-1 rounded-full border border-amber-400 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          data-testid="cabinet-lab-next"
        >
          Next →
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Mocks</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
            {mocksEnabled ? "ON" : "OFF"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => sendMockToggle(!mocksEnabled)}
          disabled={mockBusy}
          className="rounded-full border border-amber-500 px-3 py-1 font-semibold text-amber-900 transition hover:bg-amber-100"
          data-testid="cabinet-lab-mocks"
        >
          {mocksEnabled ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}
