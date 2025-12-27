"use client";

import { useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";

type LogoutButtonProps = {
  className?: string;
  redirectTo?: string;
  label?: string;
  busyLabel?: string;
};

export const LogoutButton = ({
  className = "",
  redirectTo = "/",
  label = "Выйти",
  busyLabel = "Выходим...",
}: LogoutButtonProps) => {
  const router = useAppRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore errors, proceed to redirect
    } finally {
      router.replace(redirectTo);
      router.refresh();
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
