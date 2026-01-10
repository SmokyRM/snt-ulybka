"use client";

import { useState } from "react";

type Props = {
  filled: string;
  downloadHref: string;
};

export default function TemplateClient({ filled, downloadHref }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(filled);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-[#5E704F] hover:text-[#5E704F]"
        >
          {copied ? "Скопировано" : "Скопировать"}
        </button>
        <a
          href={downloadHref}
          className="rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F]/10"
        >
          Скачать PDF
        </a>
      </div>
      <pre className="whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800">
        {filled}
      </pre>
    </div>
  );
}
