"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ViewAsUserAction = (formData: FormData) => Promise<void>;

export default function AdminViewAsUserButton({ action }: { action: ViewAsUserAction }) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!loading) return;
    setLoading(false);
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, [pathname, searchParams?.toString(), loading]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    setLoading(true);
    safetyTimerRef.current = window.setTimeout(() => {
      setLoading(false);
      safetyTimerRef.current = null;
    }, 10000);
  };

  return (
    <form action={action} onSubmit={onSubmit}>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#5E704F] border-t-transparent" />
            Переключаемся…
          </>
        ) : (
          "Смотреть как член СНТ"
        )}
      </button>
    </form>
  );
}
