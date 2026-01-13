"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { sanitizeNext } from "@/lib/sanitizeNext";

const normalizeLogin = (value: string) => {
  const v = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (v === "админ" || v === "admin") return "admin";
  if (v === "председатель" || v === "chairman" || v === "пред") return "chairman";
  if (v === "бухгалтер" || v === "accountant" || v === "бух") return "accountant";
  if (v === "секретарь" || v === "secretary" || v === "сек") return "secretary";
  return v;
};

const isPathAllowedForRole = (role: string, path: string | null | undefined) => {
  if (!path) return false;
  if (role === "admin") return path.startsWith("/admin");
  if (role === "chairman" || role === "accountant" || role === "secretary") return path.startsWith("/office");
  return false;
};

export default function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sanitizedNext = useMemo(() => {
    const raw = searchParams?.get("next") ?? null;
    return sanitizeNext(raw) ?? null;
  }, [searchParams]);

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ login: normalized, password, next: sanitizedNext ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error === "Неизвестная роль/логин" ? "Неизвестная роль" : "Неверный логин или пароль";
        setError(msg);
        return;
      }
      const redirect =
        data?.redirectUrl ||
        (data?.role === "admin"
          ? "/admin"
          : sanitizedNext && isPathAllowedForRole(data?.role, sanitizedNext)
            ? sanitizedNext
            : "/office");
      router.push(redirect);
    } catch {
      setError("Ошибка входа. Попробуйте позже.");
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
            {error}
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
    </main>
  );
}
