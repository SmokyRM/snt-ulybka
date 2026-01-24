"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getSessionClient } from "@/lib/session";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { ApiError, apiPostRaw } from "@/lib/api/client";

const showTestCodes = process.env.NEXT_PUBLIC_SHOW_TEST_CODES === "true";
const testUserCode = process.env.NEXT_PUBLIC_USER_ACCESS_CODE || "USER_CODE";
const testAdminCode = process.env.NEXT_PUBLIC_ADMIN_ACCESS_CODE || "ADMIN_CODE";

type LoginFormProps = {
  nextParam?: string;
  devLoginCode?: string | null;
  showDevHints?: boolean;
};

type LoginRole = "user" | "admin" | "board" | "accountant" | "operator" | "resident" | "chairman" | "secretary";

const defaultPathForRole = (role: LoginRole) => {
  if (role === "admin") return "/admin";
  if (role === "chairman" || role === "accountant" || role === "secretary" || role === "board") return "/office";
  return "/cabinet";
};

const isPathAllowedForRole = (role: LoginRole, path: string | null | undefined) => {
  if (!path) return false;
  if (role === "admin") return path.startsWith("/admin") || path.startsWith("/cabinet");
  if (role === "chairman" || role === "accountant" || role === "secretary" || role === "board") {
    return path.startsWith("/office");
  }
  return path.startsWith("/cabinet");
};

// Тестовые коды для предзаполнения через ?as=role
const ROLE_TEST_CODES: Record<string, string> = {
  resident: testUserCode,
  admin: testAdminCode,
};

export default function LoginForm({ nextParam, devLoginCode, showDevHints }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const asRole = searchParams?.get("as");
  const initialCode = asRole && ROLE_TEST_CODES[asRole] ? ROLE_TEST_CODES[asRole] : "";
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Sanitize next to prevent open-redirects to external URLs.
  const sanitizedNext = useMemo(() => {
    const fromUrl = searchParams?.get("next") ?? null;
    // Manual test: /login?next=/cabinet/appeals + верный код -> редирект на /cabinet/appeals.
    const safe = sanitizeNextUrl(fromUrl ?? nextParam ?? null);
    return safe ?? "/cabinet";
  }, [nextParam, searchParams]);

  useEffect(() => {
    const session = getSessionClient();
    if (isSubmittingRef.current) return;
    if (!session?.role) return;
    const role = (session.role as LoginRole) ?? "user";
    const target = isPathAllowedForRole(role, sanitizedNext) ? sanitizedNext : defaultPathForRole(role);
    // Используем push вместо replace для более быстрого перехода
    queueMicrotask(() => {
      router.push(target);
    });
  }, [router, sanitizedNext]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setErrorHint(null);
    if (!code.trim()) {
      setError("Введите код доступа.");
      return;
    }
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const data = await apiPostRaw<{ role?: string; hint?: string; error?: string }>(
        "/api/auth/login",
        { code: code.trim(), next: sanitizedNext ?? "" },
        { credentials: "include" },
      );
      const role: LoginRole = (data.role as LoginRole) ?? "user";
      const target = isPathAllowedForRole(role, sanitizedNext) ? (sanitizedNext as string) : defaultPathForRole(role);
      // Используем push вместо replace для более быстрого перехода
      // prefetch уже включен по умолчанию в Next.js для Link компонентов
      router.push(target);
    } catch (error) {
      if (error instanceof ApiError) {
        const hint =
          typeof (error.details as { hint?: string } | null)?.hint === "string"
            ? (error.details as { hint?: string }).hint
            : null;
        setErrorHint(hint ?? null);
        if (error.status === 401) {
          setError("Неверный код доступа.");
        } else {
          setError(error.message || "Ошибка входа, попробуйте позже");
        }
        return;
      }
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
        <Link href="/" className="text-sm font-medium text-[#5E704F] hover:underline">
          На главную
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-600">
        Введите код доступа, полученный от правления.
      </p>
      {sanitizedNext && (
        <p className="mt-2 text-xs text-zinc-600">
          После входа вернём вас на страницу: <span className="font-semibold">{sanitizedNext}</span>
        </p>
      )}
      {showDevHints ? (
        <p className="mt-2 text-xs font-semibold text-amber-700" data-testid="login-dev-hint">
          DEV: мастер-код {devLoginCode ? devLoginCode : "выключен"}
        </p>
      ) : null}
      <form
        className="mt-6 space-y-4"
        onSubmit={handleSubmit}
        noValidate
        data-testid="login-form"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800">Код доступа</label>
          <input
            type="password"
            inputMode="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Введите код"
            className="w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm outline-none transition-shadow focus:border-[#5E704F] focus:ring-2 focus:ring-[#5E704F]/30"
            data-testid="login-access-code"
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
          data-testid="login-submit"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
        <div className="min-h-[76px]" data-testid="login-error-block">
          {error && (
            <div className="mt-2 space-y-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              <div>{error}</div>
              {errorHint && (
                <div className="text-xs text-amber-800" data-testid="login-error-hint">{errorHint}</div>
              )}
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
