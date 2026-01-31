export default function OfficeBillingPaymentsLoading() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}
