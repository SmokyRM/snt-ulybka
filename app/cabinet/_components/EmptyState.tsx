type Props = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ title, description, actionHref, actionLabel }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-5 py-6 text-sm text-zinc-700 shadow-sm">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
      {actionHref && actionLabel ? (
        <a
          href={actionHref}
          className="mt-3 inline-flex w-fit rounded-full border border-[#5E704F]/70 px-4 py-2 text-xs font-semibold text-[#2F3827] transition hover:border-[#5E704F] hover:bg-[#5E704F]/5"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}
