"use client";

import { useState } from "react";

type AdminHelpProps = {
  title: string;
  content: string | React.ReactNode;
  className?: string;
};

export default function AdminHelp({ title, content, className = "" }: AdminHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`rounded-lg border border-zinc-200 bg-blue-50 p-3 ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold text-blue-900">💡 {title}</span>
        <span className="text-blue-700">{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <div className="mt-2 text-sm text-blue-800">
          {typeof content === "string" ? <p>{content}</p> : content}
        </div>
      )}
    </div>
  );
}
