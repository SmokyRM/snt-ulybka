"use client";

import { useMemo, useState } from "react";

type Option = { id: string; label: string; text: string };

type Props = {
  options: Option[];
};

export default function TemplateCopyCabinet({ options }: Props) {
  const [selected, setSelected] = useState(options[0]?.id ?? "all");
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const text = useMemo(
    () => options.find((opt) => opt.id === selected)?.text ?? options[0]?.text ?? "",
    [options, selected],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2000);
    }
  };

  if (!options.length) {
    return <p className="text-sm text-rose-500">Нет данных для подстановки.</p>;
  }

  return (
    <div className="space-y-4">
      {options.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold text-zinc-600">Участок:</label>
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm"
          >
            {options.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F]"
        >
          {status === "copied" ? "Скопировано" : "Скопировать"}
        </button>
        {status === "error" ? (
          <span className="text-xs text-rose-500">Не удалось скопировать</span>
        ) : status === "copied" ? (
          <span className="text-xs text-[#5E704F]">Скопировано</span>
        ) : null}
      </div>

      <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
        {text}
      </pre>
    </div>
  );
}
