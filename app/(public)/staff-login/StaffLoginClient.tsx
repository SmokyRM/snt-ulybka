"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useEffect, useRef } from "react";
import { sanitizeNextUrl } from "@/lib/sanitizeNextUrl";
import { getSafeRedirectUrl } from "@/lib/safeRedirect";
import { ApiError, apiPostRaw } from "@/lib/api/client";
import StaffLoginDiagnostics from "./StaffLoginDiagnostics";

const normalizeLogin = (value: string) => {
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (v === "админ" || v === "admin") return "admin";
  if (v === "председатель" || v === "chairman" || v === "пред") return "chairman";
  if (v === "бухгалтер" || v === "accountant" || v === "бух") return "accountant";
  if (v === "секретарь" || v === "secretary" || v === "сек") return "secretary";
  return v;
};

// Маппинг ролей для предзаполнения логина через ?as=role
const ROLE_LOGINS: Record<string, string> = {
  chairman: "председатель",
  secretary: "секретарь",
  accountant: "бухгалтер",
  admin: "админ",
};

type DiagnosticsData = {
  currentUrl: string;
  nextTarget: string | null;
  hasSessionCookie: boolean;
  currentRole: string | null;
  lastLoginAttempt: {
    status: number | null;
    error: string | null;
    timestamp: number | null;
  } | null;
};

type StaffLoginClientProps = {
  diagnosticsData: DiagnosticsData | null;
};

export default function StaffLoginClient({ diagnosticsData }: StaffLoginClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Получаем next и as из URL параметров
  const rawNext = searchParams?.get("next") ?? null;
  const asRole = searchParams?.get("as") ?? null;
  
  const nextParam = useMemo(() => {
    return sanitizeNextUrl(rawNext) ?? "/office";
  }, [rawNext]);
  
  const initialLogin = asRole && ROLE_LOGINS[asRole] ? ROLE_LOGINS[asRole] : "";
  const [login, setLogin] = useState(initialLogin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(diagnosticsData);

  // Мемоизируем sanitizedNext
  const sanitizedNext = useMemo(() => {
    return sanitizeNextUrl(nextParam) ?? null;
  }, [nextParam]);

  // useRef для отслеживания предыдущих значений, чтобы избежать бесконечного цикла
  const lastDiagKeyRef = useRef<{ currentUrl: string; nextTarget: string | null } | null>(null);

  // Обновляем URL в диагностике при изменении
  useEffect(() => {
    if (!diagnostics) return;

    const currentUrl = window.location.href;
    const nextTarget = sanitizedNext;

    // Guard: проверяем, изменились ли значения
    const prev = lastDiagKeyRef.current;
    if (prev && prev.currentUrl === currentUrl && prev.nextTarget === nextTarget) {
      return; // Значения не изменились, не обновляем
    }

    // Обновляем ref перед setState
    lastDiagKeyRef.current = { currentUrl, nextTarget };

    setDiagnostics((prev) => {
      if (!prev) return prev;
      // Дополнительная проверка: если значения уже такие же, не обновляем
      if (prev.currentUrl === currentUrl && prev.nextTarget === nextTarget) {
        return prev;
      }
      return {
        ...prev,
        currentUrl,
        nextTarget,
      };
    });
  }, [sanitizedNext]); // Убрали diagnostics из dependency array

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!login.trim() || !password.trim()) {
      setError("Укажите логин и пароль.");
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizeLogin(login);
      const data = await apiPostRaw<{
        role?: "admin" | "chairman" | "accountant" | "secretary";
        redirectUrl?: string;
        redirectTo?: string;
      }>("/api/auth/staff-login", { login: normalized, password, next: sanitizedNext ?? "" }, { credentials: "include" });
      const role = data?.role ?? "chairman";
      const redirect = data?.redirectUrl || data?.redirectTo || getSafeRedirectUrl(role, sanitizedNext);
      
      // Обновляем диагностику при успехе
      if (diagnostics) {
        setDiagnostics((prev) => ({
          ...prev!,
          lastLoginAttempt: {
            status: 200,
            error: null,
            timestamp: Date.now(),
          },
          hasSessionCookie: true,
          currentRole: role,
        }));
      }
      
      router.push(redirect);
    } catch (err) {
      let msg = "Ошибка входа. Попробуйте позже.";
      let status: number | null = null;
      if (err instanceof ApiError) {
        status = err.status;
        const details = err.details as { error?: string; message?: string } | null;
        const rawError = details?.error;
        if (rawError === "auth_not_configured") {
          msg =
            typeof details?.message === "string"
              ? details.message
              : "Код доступа для роли не настроен (env). Задайте AUTH_PASS_* в .env.local.";
        } else if (rawError === "Неизвестная роль/логин" || rawError === "invalid_credentials") {
          msg = rawError === "Неизвестная роль/логин" ? "Неизвестная роль" : "Неверный логин или пароль";
        } else if (err.message) {
          msg = err.message;
        }
      }
      setError(msg);

      if (diagnostics) {
        setDiagnostics((prev) => ({
          ...prev!,
          lastLoginAttempt: {
            status,
            error: err instanceof ApiError ? (err.details as { error?: string } | null)?.error || msg : msg,
            timestamp: Date.now(),
          },
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6"
      data-testid="staff-login-root"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Вход для сотрудников</h1>
        <Link
          href={sanitizedNext ? `/login?next=${encodeURIComponent(sanitizedNext)}` : "/login"}
          className="text-sm font-semibold text-[#5E704F] hover:underline"
        >
          Я житель → Вход по коду
        </Link>
      </div>
      <p className="text-sm text-zinc-600">
        Допустимые логины: Админ, Председатель, Бухгалтер, Секретарь. Пароли задаёт администратор.
      </p>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        data-testid="staff-login-form"
      >
        <label htmlFor="staff-login-username" className="block space-y-2 text-sm font-medium text-zinc-800">
          Роль/логин
          <input
            id="staff-login-username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Админ / Председатель / Бухгалтер / Секретарь"
            data-testid="staff-login-username"
          />
        </label>
        <label htmlFor="staff-login-password" className="block space-y-2 text-sm font-medium text-zinc-800">
          Пароль
          <input
            id="staff-login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-[#5E704F]"
            placeholder="Введите пароль"
            data-testid="staff-login-password"
          />
        </label>
        {error ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="staff-login-error">
            <div data-testid="staff-login-error-text">{error}</div>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          data-testid="staff-login-submit"
          className="w-full rounded-full bg-[#5E704F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4d5d41] disabled:opacity-60"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
      {diagnostics && <StaffLoginDiagnostics key={JSON.stringify(diagnostics)} initialData={diagnostics} />}
    </main>
  );
}
