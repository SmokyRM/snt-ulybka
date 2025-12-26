"use client";

import { useMemo, useState } from "react";
import { buildElectricityNoticeText, type NoticeTemplate } from "@/lib/electricityNotice";

type Item = {
  plotNumber: string;
  street?: string | null;
};

type Props = {
  items: Item[];
};

export function NoticeClient({ items }: Props) {
  const [deadline, setDeadline] = useState<string>("до 20:00 сегодня");
  const [template, setTemplate] = useState<NoticeTemplate>("neutral");
  const text = useMemo(
    () =>
      buildElectricityNoticeText({
        totalCount: items.length,
        plots: items,
        deadlineText: deadline,
      }, template),
    [deadline, items, template],
  );
  const listText =
    items
      .map((p) => {
        if (p.street) return `Ул. ${p.street}, уч. ${p.plotNumber || "—"}`;
        return `Уч. ${p.plotNumber || "—"}`;
      })
      .join("\n") || "—";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Уведомление</div>
          <div className="text-xs text-zinc-600">
            Сгенерируйте текст и отправьте вручную. После отправки отметьте «уведомлёнными».
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as NoticeTemplate)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
          >
            <option value="neutral">Обычное</option>
            <option value="strict">Строгое</option>
            <option value="friendly">Дружелюбное</option>
          </select>
          <input
            type="text"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-800 focus:border-[#5E704F] focus:outline-none"
            placeholder="до воскресенья 20:00"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full bg-[#5E704F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#4d5d40]"
          >
            Скопировать
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(listText);
              } catch {
                // ignore
              }
            }}
            className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-800 hover:border-zinc-400"
          >
            Скопировать список участков
          </button>
        </div>
      </div>
      <textarea
        className="h-32 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800"
        readOnly
        value={text}
      />
      <textarea
        className="h-24 w-full rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800"
        readOnly
        value={listText}
      />
    </div>
  );
}
