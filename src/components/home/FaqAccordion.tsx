"use client";

import { useId, useState } from "react";
import type { PublicContentFaqItem } from "@/lib/publicContentDefaults";

type Props = {
  items: PublicContentFaqItem[];
};

export default function FaqAccordion({ items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();

  if (items.length === 0) {
    return <p className="mt-3 text-sm text-zinc-600">Пока нет опубликованных ответов.</p>;
  }

  return (
    <div className="mt-4 space-y-2 text-sm text-zinc-700">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;
        return (
          <div key={`${item.question}-${index}`} className="rounded-xl border border-zinc-200 bg-white">
            <button
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-zinc-900">{item.question}</span>
              <span
                className={`text-xs text-zinc-500 transition-transform ${
                  isOpen ? "rotate-90" : "rotate-0"
                }`}
              >
                ▶
              </span>
            </button>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="border-t border-zinc-100 px-4 py-3 text-sm text-zinc-700"
              >
                {item.answer}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
