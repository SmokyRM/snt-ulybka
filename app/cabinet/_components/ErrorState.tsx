type Props = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function ErrorState({
  title,
  description,
  actionHref = "/cabinet",
  actionLabel = "Обновить",
}: Props) {
  const href = actionHref ?? "/cabinet";
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-900 shadow-sm">
      <div className="text-base font-semibold">{title}</div>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
      <a
        href={href}
        className="mt-3 inline-flex w-fit rounded-full border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800 transition hover:border-rose-400"
      >
        {actionLabel}
      </a>
    </div>
  );
}
