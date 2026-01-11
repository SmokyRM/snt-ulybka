"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import { useRouteLoader } from "@/components/RouteLoaderProvider";

type LogoutButtonProps = {
  className?: string;
  redirectTo?: string;
  label?: string;
  busyLabel?: string;
  onAfterLogout?: () => void;
};

export const LogoutButton = ({
  className = "",
  redirectTo = "/",
  label = "Выйти",
  busyLabel = "Выходим...",
  onAfterLogout,
}: LogoutButtonProps) => {
  const router = useAppRouter();
  const { stop } = useRouteLoader();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore errors, proceed to redirect
    } finally {
      stop();
      router.replace(redirectTo);
      router.refresh();
      onAfterLogout?.();
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? busyLabel : label}
    </button>
  );
};
