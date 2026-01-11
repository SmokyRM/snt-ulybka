"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Sanitize next to prevent open-redirects to external URLs.
  const sanitizedNext = useMemo(() => {
    const fromUrl = searchParams?.get("next") ?? null;
    // Manual test: /login?next=/cabinet/appeals + верный код -> редирект на /cabinet/appeals.
    const safe = sanitizeNext(fromUrl ?? nextParam);
    return safe ?? "/cabinet";
  }, [nextParam, searchParams]);

  useEffect(() => {
    const session = getSessionClient();
    if (isSubmittingRef.current) return;
    if (!session?.role) return;
    const target = sanitizedNext ?? "/cabinet";
    queueMicrotask(() => {
      router.replace(target);
      router.refresh();
    });
  }, [router, sanitizedNext]);

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
        credentials: "include",
        body: JSON.stringify({ code: code.trim(), next: sanitizedNext ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? "Неверный код доступа." : "Ошибка входа, попробуйте позже");
        return;
      }
      const role: LoginRole = (data.role as LoginRole) ?? "user";
      const target = sanitizedNext ?? (role === "admin" ? "/admin" : "/cabinet");
      router.replace(target);
      router.refresh();
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
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
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
        <div className="min-h-[76px]">
          {error && (
            <div className="mt-2 space-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              <div>{error}</div>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-[#5E704F]">
                <Link href="/#get-access" className="hover:underline">
                  Как получить доступ
                </Link>
                <Link href="/contacts" className="hover:underline">
                  Нужна помощь? Напишите в правление
                </Link>
              </div>
            </div>
          )}
        </div>
      </form>
    </>
  );
}
