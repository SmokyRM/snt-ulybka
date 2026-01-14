"use client";

import { useState } from "react";

/**
 * Helper to clear QA-related keys from localStorage and sessionStorage
 */
function clearQaFromStorage(): void {
  try {
    // Clear localStorage
    const localStorageKeys = Object.keys(localStorage);
    for (const key of localStorageKeys) {
      if (key.toLowerCase().includes("qa") || key.toLowerCase().includes("admin_view")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore errors
  }

  try {
    // Clear sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage);
    for (const key of sessionStorageKeys) {
      if (key.toLowerCase().includes("qa") || key.toLowerCase().includes("admin_view")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore errors
  }
}

export default function GlobalLogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    // a) setLoading(true)
    setLoading(true);

    try {
      // b) Если NODE_ENV !== "production": POST /api/admin/qa/reset
      if (process.env.NODE_ENV !== "production") {
        try {
          await fetch("/api/admin/qa/reset", { method: "POST" });
        } catch {
          // Ошибку не фейлить, продолжаем дальше
        }
      }

      // c) Всегда: очистить localStorage и sessionStorage
      clearQaFromStorage();

      // d) Всегда: POST /api/auth/logout
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // если упал — всё равно продолжаем
      }

      // e) Всегда: window.location.assign("/login")
      window.location.assign("/login");
    } catch (error) {
      // Even on error, try to redirect
      console.error("Logout error:", error);
      window.location.assign("/login");
    } finally {
      // f) finally: setLoading(false)
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      data-testid="global-logout"
      className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Выход…" : "Выйти"}
    </button>
  );
}
