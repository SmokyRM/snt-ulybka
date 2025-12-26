"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSessionClient } from "@/lib/session";
import { sanitizeNext } from "@/lib/sanitizeNext";

const showTestCodes = process.env.NEXT_PUBLIC_SHOW_TEST_CODES === "true";
const testUserCode = process.env.NEXT_PUBLIC_USER_ACCESS_CODE || "USER_CODE";
const testAdminCode = process.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE || "ADMIN_CODE";

type LoginFormProps = {
  nextParam?: string;
};

export default function LoginForm({ nextParam }: LoginFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sanitizedNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const allowedNextForRole = useCallback(
    (role: "user" | "admin"): string | null => {
      if (!sanitizedNext) return null;
      if (role === "admin") {
        if (sanitizedNext.startsWith("/admin") || sanitizedNext.startsWith("/cabinet")) {
          return sanitizedNext;
        }
        return null;
      }
      if (sanitizedNext.startsWith("/cabinet")) {
        return sanitizedNext;
      }
      return null;
    },
    [sanitizedNext]
  );

  useEffect(() => {
    const session = getSessionClient();
    if (session?.role) {
      const fallback = session.role === "admin" ? "/admin" : "/cabinet";
      const target = allowedNextForRole(session.role) ?? fallback;
      router.replace(target);
    }
  }, [router, sanitizedNext, allowedNextForRole]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Введите код доступа.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? "Неверный код доступа" : "Ошибка входа, попробуйте позже");
        return;
      }
      const role: "user" | "admin" = data.role === "admin" ? "admin" : "user";
      if (role === "admin") {
        const fallback = "/admin";
        const nextAllowed = allowedNextForRole(role);
        const target = nextAllowed ?? fallback;
        router.replace(target);
      } else {
        // Всегда ведём в кабинет, он сам отправит на onboarding при незаполненном профиле.
        router.replace("/cabinet");
      }
    } catch {
      setError("Ошибка входа, попробуйте позже");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Вход</h1>
        <Link href="/" className="text-sm font-medium text-[#5E704F] hover:underline">
          На главную
        </Link>
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
