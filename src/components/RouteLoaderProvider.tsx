"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type RouteLoaderContextValue = {
  start: () => void;
  stop: () => void;
  isLoading: boolean;
};

const defaultRouteLoader: RouteLoaderContextValue = {
  start: () => {},
  stop: () => {},
  isLoading: false,
};

const RouteLoaderContext = createContext<RouteLoaderContextValue>(defaultRouteLoader);

const DELAY_MS = 180;

export function RouteLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const showLoader = pathname.startsWith("/admin") || pathname.startsWith("/cabinet");

  const stop = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const start = useCallback(() => {
    if (timerRef.current || isLoading) return;
    timerRef.current = window.setTimeout(() => {
      setIsLoading(true);
      timerRef.current = null;
    }, DELAY_MS);
  }, [isLoading]);

  useEffect(() => {
    stop();
  }, [pathname, stop]);

  return (
    <RouteLoaderContext.Provider value={{ start, stop, isLoading }}>
      {children}
      {isLoading && showLoader ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[100] flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm">
          <span className="route-loader-arrow text-[#5E704F]">→</span>
          Загрузка…
        </div>
      ) : null}
    </RouteLoaderContext.Provider>
  );
}

export function useRouteLoader() {
  return useContext(RouteLoaderContext);
}
