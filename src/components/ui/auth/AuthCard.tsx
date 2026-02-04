"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** Sanitize `next` param — only allow relative paths within the site. */
export function sanitizeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  // Only allow paths starting with /
  if (!next.startsWith("/")) return null;
  // Block protocol-relative URLs (//evil.com)
  if (next.startsWith("//")) return null;
  // Block javascript: and data: schemes hidden in path
  if (/^\/[^/]*:/i.test(next)) return null;
  return next;
}

const linkClass =
  "inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";
const backClass =
  "inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50";
const primaryClass =
  "inline-flex items-center justify-center rounded-full bg-[#5E704F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4d5d41]";

export type AuthCardProps = {
  title: string;
  description: string;
  hint?: string;
  showStaffLogin?: boolean;
  showResidentLogin?: boolean;
  showHome?: boolean;
  showBack?: boolean;
  showRetry?: boolean;
  onRetry?: () => void;
  nextPath?: string | null;
  children?: React.ReactNode;
};

export default function AuthCard({
  title,
  description,
  hint,
  showStaffLogin = false,
  showResidentLogin = false,
  showHome = true,
  showBack = true,
  showRetry = false,
  onRetry,
  nextPath,
  children,
}: AuthCardProps) {
  const router = useRouter();
  const safeNext = sanitizeNextPath(nextPath);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const staffLoginHref = safeNext ? `/staff/login?next=${encodeURIComponent(safeNext)}` : "/staff/login";
  const residentLoginHref = safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login";

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-10 text-zinc-900"
      data-testid="auth-card-root"
    >
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm text-zinc-600">{description}</p>
        {hint && <p className="mt-2 text-xs text-zinc-500">{hint}</p>}
        {children}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {showBack && (
            <button type="button" className={backClass} onClick={handleBack}>
              Назад
            </button>
          )}
          {showStaffLogin && (
            <Link href={staffLoginHref} className={primaryClass} data-testid="staff-login-link">
              Войти сотруднику
            </Link>
          )}
          {showResidentLogin && (
            <Link href={residentLoginHref} className={linkClass} data-testid="resident-login-link">
              Войти жителю
            </Link>
          )}
          {showHome && (
            <Link href="/" className={linkClass}>
              На главную
            </Link>
          )}
          {showRetry && onRetry && (
            <button type="button" className={primaryClass} onClick={onRetry}>
              Повторить
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
