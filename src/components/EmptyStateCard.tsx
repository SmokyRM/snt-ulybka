import Link from "next/link";

/**
 * Server-friendly empty state: только serializable props.
 * Для интерактива по ссылке — actionHref + actionLabel.
 * Для handler (модалка, click) — используйте EmptyStateCardClient в Client Component.
 */
type EmptyStateCardProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function EmptyStateCard({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateCardProps) {
  const btnClass =
    "mt-4 rounded-full border border-[#5E704F] px-4 py-2 text-xs font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      {description ? <p className="mt-2 text-sm text-zinc-600">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Link href={actionHref} className={`inline-block ${btnClass}`}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
