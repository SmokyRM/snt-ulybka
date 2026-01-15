"use client";

import { useState } from "react";

type AnalyticsPoint = {
  period: string;
  membership: { accrued: number; paid: number; debt: number };
  target: { accrued: number; paid: number; debt: number };
  electricity: { accrued: number; paid: number; debt: number };
};

function Placeholder() {
  return (
    <div className="rounded border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
      Нет данных
    </div>
  );
}

export default function AnalyticsBlockClient({ points }: { points: AnalyticsPoint[] }) {
  const dataset = points.slice(-6);
  const [type, setType] = useState<"membership" | "target" | "electricity">("membership");
  if (!dataset.length) return <Placeholder />;
  const max = Math.max(...dataset.map((p) => p[type].accrued), 1);
  return (
    <div className="space-y-3 text-sm text-zinc-800">
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-block h-3 w-3 rounded bg-[#5E704F]" /> Начислено
        <span className="inline-block h-3 w-3 rounded bg-[#9BB487]" /> Оплачено
      </div>
      <div className="flex gap-2 text-xs">
        {(["membership", "target", "electricity"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 ${
              type === t ? "bg-[#5E704F] text-white" : "border border-zinc-300 text-zinc-800"
            }`}
          >
            {t === "membership" ? "Членские" : t === "target" ? "Целевые" : "Электро"}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        {dataset.map((p) => {
          const acc = p[type].accrued;
          const paid = p[type].paid;
          const accH = (acc / max) * 100;
          const paidH = (paid / max) * 100;
          return (
            <div key={p.period} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end gap-1">
                <div className="w-1/2 rounded-t bg-[#5E704F]" style={{ height: `${accH}%` }} />
                <div className="w-1/2 rounded-t bg-[#9BB487]" style={{ height: `${paidH}%` }} />
              </div>
              <div className="text-[11px] text-zinc-600">{p.period}</div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-zinc-600">Данные за последние месяцы</div>
    </div>
  );
}
