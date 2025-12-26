"use client";

import { useState } from "react";
import { buildPaymentPurpose } from "@/lib/paymentPurpose";

type Props = {
  street: string | null;
  plotNumber: string | null;
  lastReading?: number | null;
};

export function PaymentPurposeClient({ street, plotNumber, lastReading }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyPurpose = async (type: "electricity" | "membership" | "target") => {
    const text = buildPaymentPurpose({
      street,
      plotNumber,
      paymentType: type,
      readingNow: lastReading ?? null,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => copyPurpose("electricity")}
        className="rounded-full border border-[#5E704F] px-3 py-2 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
      >
        Скопировать назначение: Электроэнергия
      </button>
      <button
        type="button"
        onClick={() => copyPurpose("membership")}
        className="rounded-full border border-[#5E704F] px-3 py-2 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
      >
        Скопировать назначение: Членские
      </button>
      <button
        type="button"
        onClick={() => copyPurpose("target")}
        className="rounded-full border border-[#5E704F] px-3 py-2 text-xs font-semibold text-[#5E704F] hover:bg-[#5E704F]/10"
      >
        Скопировать назначение: Целевой
      </button>
      {copied && <span className="text-xs text-zinc-600">Скопировано ({copied})</span>}
    </div>
  );
}
