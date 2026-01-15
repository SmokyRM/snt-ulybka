"use client";

import Link from "next/link";
import { normalizeRole } from "@/lib/rbac";
// GlobalLogoutButton находится в app/_components, но мы не можем его импортировать из src
// Используем простую кнопку выхода вместо этого

type ErrorStateProps = {
  title?: string;
  description?: string;
  userRole?: string | null;
  showBack?: boolean;
  showAdmin?: boolean;
  showOffice?: boolean;
  showSite?: boolean;
  showLogin?: boolean;
};

export default function ErrorState({
  title = "Ошибка",
  description = "Произошла ошибка при загрузке данных.",
  userRole = null,
  showBack = true,
  showAdmin = true,
  showOffice = true,
  showSite = true,
  showLogin = true,
}: ErrorStateProps) {
  const normalizedRole = normalizeRole(userRole);
  const canAccessAdmin = normalizedRole === "admin";
  const canAccessOffice =
    normalizedRole === "admin" ||
    normalizedRole === "chairman" ||
    normalizedRole === "secretary" ||
    normalizedRole === "accountant";

  const linkClass =
    "inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";
  const backClass =
    "inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50";

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-red-900">{title}</h2>
      {description && <p className="mt-2 text-sm text-red-700">{description}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {showBack && (
          <button type="button" className={backClass} onClick={handleBack}>
            Назад
          </button>
        )}
        {showAdmin && canAccessAdmin && (
          <Link href="/admin" className={linkClass}>
            В админку
          </Link>
        )}
        {showOffice && canAccessOffice && (
          <Link href="/office" className={linkClass}>
            В офис
          </Link>
        )}
        {showSite && (
          <Link href="/" className={linkClass}>
            На сайт
          </Link>
        )}
        {showLogin && (
          <Link href="/login" className={linkClass}>
            Войти
          </Link>
        )}
      </div>
    </div>
  );
}
