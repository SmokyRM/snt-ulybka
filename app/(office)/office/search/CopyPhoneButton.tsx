"use client";

import { useState } from "react";

type Props = {
  phone: string;
  contactId: string;
};

export default function CopyPhoneButton({ phone, contactId }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy phone:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-[#5E704F] hover:underline"
      data-testid={`search-copy-phone-${contactId}`}
    >
      {copied ? "Скопировано!" : phone}
    </button>
  );
}
