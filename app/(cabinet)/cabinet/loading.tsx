import Skeleton from "@/components/Skeleton";

export default function CabinetLoading() {
  return (
    <main className="min-h-screen bg-[#F8F1E9] px-4 py-12 text-zinc-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-xl" />
            <Skeleton className="h-4 w-52 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex sm:flex-wrap">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-full rounded-full sm:w-32" />
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-6 w-44 rounded-lg" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
