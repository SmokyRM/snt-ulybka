"use client";

import Link from "next/link";

type IconProps = { className?: string };

function InboxIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75a2.25 2.25 0 012.25-2.25h13.5a2.25 2.25 0 012.25 2.25v6.75m-17.5 0v4.5a2.25 2.25 0 002.25 2.25h13.5a2.25 2.25 0 002.25-2.25v-4.5" />
    </svg>
  );
}

function SearchIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function DocumentIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function CreditCardIcon({ className }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  );
}

const ICONS = {
  inbox: InboxIcon,
  search: SearchIcon,
  document: DocumentIcon,
  users: UsersIcon,
  payment: CreditCardIcon,
} as const;

export type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
};

export type EmptyStateProps = {
  /** Icon to display (default: "inbox"). */
  icon?: keyof typeof ICONS;
  /** Main title. */
  title: string;
  /** Description text (what user can do). */
  description?: string;
  /** Action buttons/links. */
  actions?: EmptyStateAction[];
  className?: string;
};

const linkClass =
  "inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";
const primaryClass =
  "inline-flex items-center justify-center rounded-full bg-[#5E704F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]";

/**
 * Empty state component for lists/tables with no data.
 *
 * Example:
 * ```tsx
 * <EmptyState
 *   icon="users"
 *   title="Нет участников"
 *   description="Добавьте первого участника в реестр."
 *   actions={[
 *     { label: "Добавить участника", href: "/admin/registry/new", primary: true },
 *   ]}
 * />
 * ```
 */
export default function EmptyState({
  icon = "inbox",
  title,
  description,
  actions = [],
  className = "",
}: EmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-12 text-center ${className}`}
      data-testid="empty-state"
    >
      <div className="mb-4 rounded-full bg-zinc-100 p-3" aria-hidden="true">
        <Icon className="h-8 w-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-600">{description}</p>}
      {actions.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions.map((action, idx) => {
            const buttonClass = action.primary ? primaryClass : linkClass;

            if (action.href) {
              return (
                <Link key={idx} href={action.href} className={buttonClass}>
                  {action.label}
                </Link>
              );
            }

            return (
              <button key={idx} type="button" onClick={action.onClick} className={buttonClass}>
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
