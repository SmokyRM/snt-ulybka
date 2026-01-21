type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
};

export function CabinetCard({ title, subtitle, actionHref, actionLabel, children }: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900">{title}</div>
          {subtitle ? <div className="text-xs text-zinc-600">{subtitle}</div> : null}
        </div>
        {actionHref && actionLabel ? (
          <a
            href={actionHref}
            className="rounded-full border border-[#5E704F]/60 px-3 py-1 text-xs font-semibold text-[#2F3827] transition hover:border-[#5E704F] hover:bg-[#5E704F]/5"
          >
            {actionLabel}
          </a>
        ) : null}
      </div>
      {children}
    </div>
  );
}
