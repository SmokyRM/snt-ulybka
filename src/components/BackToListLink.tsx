"use client";

import Link from "next/link";

type BackToListLinkProps = {
  href: string;
  label?: string;
};

export default function BackToListLink({ href, label = "← Назад к списку" }: BackToListLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 transition hover:text-[#5E704F]"
    >
      {label}
    </Link>
  );
}
