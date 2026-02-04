"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthCard from "./AuthCard";

const REASON_LABELS: Record<string, string> = {
  "auth.required": "Требуется вход в систему.",
  "admin.only": "Доступно только администраторам.",
  "office.only": "Доступно только сотрудникам офиса.",
  "cabinet.only": "Только члены СНТ могут попасть на эту страницу.",
  forbidden: "У вас нет прав для этой операции.",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  board: "Совет",
  accountant: "Бухгалтер",
  secretary: "Секретарь",
  chairman: "Председатель",
  operator: "Оператор",
  resident: "Член СНТ",
  user: "Член СНТ",
  guest: "Гость",
};

const linkClass =
  "inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";

export type ForbiddenProps = {
  /** Reason code (e.g. "admin.only") — used to display specific message. */
  reason?: string | null;
  /** User's current role (for display). */
  role?: string | null;
  /** Can access /admin. */
  canAccessAdmin?: boolean;
  /** Can access /office. */
  canAccessOffice?: boolean;
  /** Can access /cabinet. */
  canAccessCabinet?: boolean;
  /** Extra hint (e.g. for QA cabinet). */
  hint?: string;
};

/**
 * Full-page "Access Denied" UI — shown when user has a session but
 * lacks the required role/permission.
 */
export default function Forbidden({
  reason,
  role,
  canAccessAdmin = false,
  canAccessOffice = false,
  canAccessCabinet = false,
  hint,
}: ForbiddenProps) {
  const router = useRouter();
  const reasonText = reason ? REASON_LABELS[reason] ?? reason : "Доступ ограничен.";
  const roleText = role ? ROLE_LABELS[role] ?? role : "Гость";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#F8F1E9] px-4 py-10 text-zinc-900"
      data-testid="forbidden-root"
    >
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Нет доступа</h1>
        <p className="mt-3 text-sm text-zinc-600">{reasonText}</p>
        <p className="mt-1 text-sm text-zinc-600">
          Ваша роль: <span className="font-semibold text-zinc-900">{roleText}</span>
        </p>
        {hint && <p className="mt-3 text-xs text-zinc-500">{hint}</p>}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
            onClick={handleBack}
          >
            Назад
          </button>
          {canAccessAdmin && (
            <Link href="/admin" className={linkClass}>
              В админку
            </Link>
          )}
          {canAccessOffice && (
            <Link href="/office" className={linkClass}>
              В офис
            </Link>
          )}
          {canAccessCabinet && (
            <Link href="/cabinet" className={linkClass}>
              В кабинет
            </Link>
          )}
          <Link href="/" className={linkClass}>
            На главную
          </Link>
        </div>
      </div>
    </main>
  );
}
