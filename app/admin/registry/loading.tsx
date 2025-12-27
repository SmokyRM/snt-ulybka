import Skeleton from "@/components/Skeleton";

export default function LoadingRegistry() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="grid grid-cols-7 gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-xs">
            {Array.from({ length: 7 }).map((_, idx) => (
              <Skeleton key={idx} className="h-4 w-full rounded" />
            ))}
          </div>
          <div className="divide-y divide-zinc-100">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-7 gap-2 px-3 py-3">
                {Array.from({ length: 7 }).map((__, cell) => (
                  <Skeleton key={cell} className="h-4 w-full rounded" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
