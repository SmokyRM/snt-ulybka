"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { mapQaStageToPath, QA_CABINET_STAGES, type QaCabinetStage } from "@/lib/qaCabinetStage.shared";

type Props = {
  initialStage: QaCabinetStage | null;
  mocksEnabled: boolean;
  onboardingStep?: string | null;
};

export function QaCabinetControl({ initialStage, mocksEnabled, onboardingStep }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<QaCabinetStage | null>(initialStage);
  const [mock, setMock] = useState(mocksEnabled);
  const [busy, setBusy] = useState(false);

  const currentLabel = useMemo(() => stage ?? "реальный", [stage]);
  const onboardingLabel = onboardingStep ?? "—";

  const refreshWithFallback = () => {
    try {
      router.refresh();
    } catch {
      // ignore
    }
    if (process.env.NODE_ENV !== "production") {
      setTimeout(() => {
        try {
          router.refresh();
        } catch {
          window.location.reload();
        }
      }, 150);
    }
  };

  const handleStageChange = async (next: QaCabinetStage | null) => {
    setBusy(true);
    try {
      await fetch("/api/qa/cabinet-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: next }),
      });
      setStage(next);
    } catch {
      // ignore
    } finally {
      setBusy(false);
      refreshWithFallback();
    }
  };

  const handleMockToggle = async (next: boolean) => {
    setBusy(true);
    try {
      await fetch("/api/qa/cabinet-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      setMock(next);
    } catch {
      // ignore
    } finally {
      setBusy(false);
      refreshWithFallback();
    }
  };

  const openCabinet = (target: string) => {
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const currentScreenUrl = stage ? (mapQaStageToPath(stage) ?? "/cabinet") : "/cabinet";
  const openCurrent = () => {
    openCabinet(currentScreenUrl);
  };

  const reset = async () => {
    await handleStageChange(null);
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Кабинет жителя (тест)</p>
          <p className="text-sm text-zinc-600">Быстро переключайте этап и мок-данные без переходов.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col items-start gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openCabinet("/cabinet");
              }}
              className="h-10 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-800 transition hover:border-amber-500 hover:text-amber-800"
              disabled={busy}
            >
              Открыть кабинет
            </button>
            <span className="text-[10px] text-zinc-500">Откроется: /cabinet</span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openCurrent();
              }}
              className="h-10 rounded-lg border border-amber-500 bg-amber-50 px-3 text-sm font-semibold text-amber-900 transition hover:border-amber-600"
              disabled={busy}
            >
              Открыть текущий экран
            </button>
            <span className="text-[10px] text-zinc-500">Откроется: {currentScreenUrl}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              reset();
            }}
            className="h-10 rounded-lg border border-rose-300 px-3 text-sm font-medium text-rose-800 transition hover:border-rose-400"
            disabled={busy}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm">
          <span className="text-zinc-600">Этап (принудительно)</span>
          <select
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 focus:border-amber-500 focus:outline-none"
            value={stage ?? ""}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const value = e.target.value as QaCabinetStage;
              handleStageChange(value || null);
            }}
            disabled={busy}
          >
            <option value="">Реальный</option>
            {QA_CABINET_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-400"
            checked={mock}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleMockToggle(e.target.checked);
            }}
            disabled={busy}
          />
          <span>Мок-данные (демо)</span>
        </label>
      </div>

      <div className="mt-2 space-y-1 text-xs text-zinc-600">
        <p>Этап: <span className="font-semibold text-zinc-900">{currentLabel}</span> • Онбординг:{" "}
        <span className="font-semibold text-zinc-900">{onboardingLabel}</span> • Моки:{" "}
        <span className="font-semibold text-zinc-900">{mock ? "включены" : "выключены"}</span>
        </p>
        <p>Принудительный этап работает только в режиме теста. Мок-данные — демо контент без запросов к прод-данным.</p>
      </div>
    </div>
  );
}
