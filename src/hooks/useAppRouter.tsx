"use client";

import { useRouter } from "next/navigation";
import { useRouteLoader } from "@/components/RouteLoaderProvider";

export function useAppRouter() {
  const router = useRouter();
  const { start } = useRouteLoader();

  return {
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      start();
      return router.push(...args);
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      start();
      return router.replace(...args);
    },
  };
}
