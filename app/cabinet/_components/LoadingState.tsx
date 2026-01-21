export function LoadingState({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-zinc-200" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, idx) => (
          <div key={idx} className="h-3 w-full animate-pulse rounded bg-zinc-200" />
        ))}
      </div>
    </div>
  );
}
