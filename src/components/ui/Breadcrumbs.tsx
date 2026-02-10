"use client";

import Link from "next/link";

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export type BreadcrumbItem = {
  /** Display text. */
  title: string;
  /** Link href — omit for the last (current) item. */
  href?: string;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Breadcrumb navigation component.
 * Last item is rendered without a link (current page).
 *
 * Example:
 * ```tsx
 * <Breadcrumbs items={[
 *   { title: "Админка", href: "/admin" },
 *   { title: "Реестр", href: "/admin/registry" },
 *   { title: "Участок №123" }, // no href = current
 * ]} />
 * ```
 */
export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 text-sm text-zinc-600 ${className}`}
      data-testid="breadcrumbs"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;

        return (
          <span key={idx} className="flex items-center gap-1">
            {idx > 0 && <ChevronRightIcon className="h-3.5 w-3.5 text-zinc-400" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-[#5E704F] hover:underline transition-colors">
                {item.title}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-zinc-900" : ""}>{item.title}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
