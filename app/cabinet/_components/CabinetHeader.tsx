type Props = {
  title: string;
  statusLine?: string;
  actions?: React.ReactNode;
  progressLabel?: string | null;
  progressHref?: string | null;
};

export function CabinetHeader({ title, statusLine, actions, progressLabel, progressHref }: Props) {
  return (
    <header className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          {statusLine ? <p className="text-sm text-zinc-600">{statusLine}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {progressLabel ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">{progressLabel}</span>
          {progressHref ? (
            <a
              href={progressHref}
              className="rounded-full border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Продолжить
            </a>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
