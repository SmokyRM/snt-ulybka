"use client";

import { useState } from "react";
import { qaText } from "@/lib/qaText";

type QaCopyButtonProps = {
  value: string;
  testId: string;
  label?: string;
};

export default function QaCopyButton({ value, testId, label }: QaCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback для старых браузеров
      const textArea = document.createElement("textarea");
      textArea.value = value;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore
      }
      document.body.removeChild(textArea);
    }
  };

  const ariaLabel = label
    ? copied
      ? `Скопировано: ${label}`
      : `Скопировать ${label}`
    : copied
      ? "Скопировано"
      : "Скопировать";

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testId}
      className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-[#5E704F] hover:bg-[#5E704F]/5 hover:text-[#5E704F] focus:outline-none focus:ring-2 focus:ring-[#5E704F] focus:ring-offset-1"
      title={qaText.misc.copyLabel(label)}
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {copied ? qaText.misc.copyButtonCopied : qaText.misc.copyButtonText}
    </button>
  );
}
