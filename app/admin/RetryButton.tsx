"use client";

import { useRouter } from "next/navigation";

type RetryButtonProps = {
  label?: string;
  className?: string;
};

export function RetryButton({ label = "Повторить", className }: RetryButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className={
        className ??
        "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-800 hover:border-zinc-400"
      }
    >
      {label}
    </button>
  );
}
