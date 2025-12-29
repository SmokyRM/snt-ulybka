"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

type AdminNavigationContextValue = {
  isNavigating: boolean;
  start: () => void;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue>({
  isNavigating: false,
  start: () => {},
});

export function useAdminNavigationProgress() {
  return useContext(AdminNavigationContext);
}

export default function AdminNavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [show, setShow] = useState(false);
  const startAtRef = useRef<number | null>(null);
  const isNavigatingRef = useRef(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const start = useCallback(() => {
    if (isNavigatingRef.current) return;
    clearTimers();
    isNavigatingRef.current = true;
    setIsNavigating(true);
    startAtRef.current = Date.now();
    showTimerRef.current = window.setTimeout(() => {
      if (isNavigatingRef.current) {
        setShow(true);
      }
    }, 180);
  }, []);

  const stop = useCallback(() => {
    if (!isNavigatingRef.current) return;
    clearTimers();
    const elapsed = startAtRef.current ? Date.now() - startAtRef.current : 0;
    const minVisibleMs = 350;
    const remaining = Math.max(minVisibleMs - elapsed, 0);
    hideTimerRef.current = window.setTimeout(() => {
      isNavigatingRef.current = false;
      setShow(false);
      setIsNavigating(false);
    }, remaining);
  }, []);

  useEffect(() => {
    stop();
  }, [pathname, searchParams?.toString(), stop]);

  const value = useMemo(
    () => ({
      isNavigating,
      start,
    }),
    [isNavigating, start]
  );

  return (
    <AdminNavigationContext.Provider value={value}>
      {show ? (
        <>
          <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-1 bg-[#5E704F] opacity-80 animate-pulse" />
          <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/5">
            {/* UX: lightweight overlay so users don't think the old page is stuck */}
            <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-[#5E704F]" />
              Загружаем…
            </div>
          </div>
        </>
      ) : null}
      {children}
    </AdminNavigationContext.Provider>
  );
}
