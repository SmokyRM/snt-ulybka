"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppRouter } from "@/hooks/useAppRouter";
import AppLink from "@/components/AppLink";
import { getSessionClient } from "@/lib/session";
import { sanitizeNext } from "@/lib/sanitizeNext";

const showTestCodes = process.env.NEXT_PUBLIC_SHOW_TEST_CODES === "true";
const testUserCode = process.env.NEXT_PUBLIC_USER_ACCESS_CODE || "USER_CODE";
const testAdminCode = process.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE || "ADMIN_CODE";

type LoginFormProps = {
  nextParam?: string;
};

type LoginRole = "user" | "admin" | "board" | "accountant" | "operator";

export default function LoginForm({ nextParam }: LoginFormProps) {
  const router = useAppRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Sanitize next to prevent open-redirects to external URLs.
  const sanitizedNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const allowedNextForRole = useCallback(
    (role: LoginRole): string | null => {
      if (!sanitizedNext) return null;
      const isAdminRole = role !== "user";
      if (isAdminRole) {
        if (sanitizedNext.startsWith("/admin")) return sanitizedNext;
        if (sanitizedNext.startsWith("/cabinet")) {
          // Do not read admin_view on client; it can be HttpOnly or scoped by path. Rely on server guard.
          if (process.env.NODE_ENV !== "production") {
            console.log("[allowedNextForRole] admin next=/cabinet -> /cabinet");
          }
          return "/cabinet";
        }
        if (sanitizedNext === "/") return sanitizedNext;
        if (process.env.NODE_ENV !== "production") {
          console.log("[allowedNextForRole] admin next not allowed", sanitizedNext);
        }
        return null;
      }
      if (sanitizedNext.startsWith("/admin")) return null;
      if (sanitizedNext.startsWith("/cabinet") || sanitizedNext === "/") return sanitizedNext;
      return null;
    },
    [sanitizedNext]
  );

  useEffect(() => {
    const session = getSessionClient();
    if (isSubmittingRef.current) return;
    if (sanitizedNext) return;
    if (session?.role) {
      const fallback = session.role === "user" ? "/cabinet" : "/admin";
      const target = allowedNextForRole(session.role) ?? fallback;
      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[login] role=",
          session.role,
          "target=",
          target,
          "admin_view_cookie_set=",
          session.role === "admin" && target.startsWith("/cabinet")
        );
      }
      queueMicrotask(() => router.replace(target));
    }
  }, [router, sanitizedNext, allowedNextForRole]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Введите код доступа.");
      return;
    }
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), next: sanitizedNext ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? "Неверный код доступа" : "Ошибка входа, попробуйте позже");
        return;
      }
      const role: LoginRole = (data.role as LoginRole) ?? "user";
      if (role !== "user") {
        const fallback = "/admin";
        const nextAllowed = allowedNextForRole(role);
        const target = nextAllowed ?? fallback;
        if (process.env.NODE_ENV !== "production") {
          console.log("[login-submit]", { role, nextParam, sanitizedNext, nextAllowed, target });
        }
        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[login] role=",
            role,
            "target=",
            target,
            "admin_view_cookie_set=",
            role === "admin" && target.startsWith("/cabinet")
          );
        }
        if (process.env.NODE_ENV !== "production") {
          console.log("[login-success] role=", role, "sanitizedNext=", sanitizedNext, "target=", target);
        }
        queueMicrotask(() => router.replace(target));
      } else {
        // Всегда ведём в кабинет, он сам отправит на onboarding при незаполненном профиле.
        const nextAllowed = allowedNextForRole(role);
        if (process.env.NODE_ENV !== "production") {
          console.log("[login-success] role=", role, "sanitizedNext=", sanitizedNext, "target=", nextAllowed ?? "/cabinet");
        }
        router.replace(nextAllowed ?? "/cabinet");
      }
    } catch {
      setError("Ошибка входа, попробуйте позже");
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <AppLink href="/" className="text-sm font-medium text-[#5E704F] hover:underline">
          На главную
        </AppLink>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Введите код доступа, полученный от правления. После входа вы перейдёте в личный кабинет.
      </p>
      {sanitizedNext && (
        <p className="mt-2 text-xs text-zinc-600">
          После входа вернём вас на страницу: <span className="font-semibold">{sanitizedNext}</span>
        </p>
      )}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Код доступа</label>
          <input
            type="password"
            inputMode="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите код"
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
          />
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {showTestCodes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            Для теста в dev:
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCode(testUserCode)}
                className="rounded-full border border-amber-300 px-3 py-1 font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                Войти как пользователь
              </button>
              <button
                type="button"
                onClick={() => setCode(testAdminCode)}
                className="rounded-full border border-amber-300 px-3 py-1 font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                Войти как админ
              </button>
            </div>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </>
  );
}
