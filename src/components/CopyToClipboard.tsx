"use client";

import { useState } from "react";

interface Props {
  text: string;
  label?: string;
}

export default function CopyToClipboard({ text, label = "Скопировать" }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!navigator?.clipboard) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition-colors hover:bg-[#5E704F]/10"
    >
      {copied ? "Скопировано" : label}
    </button>
  );
}
