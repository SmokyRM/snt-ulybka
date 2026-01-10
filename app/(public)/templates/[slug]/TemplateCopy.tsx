"use client";

import { useState } from "react";

type Props = {
  text: string;
};

export default function TemplateCopy({ text }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

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

  return (
    <div className="space-y-3">
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
