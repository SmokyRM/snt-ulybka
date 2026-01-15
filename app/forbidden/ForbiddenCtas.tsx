"use client";

import Link from "next/link";
import GlobalLogoutButton from "../_components/GlobalLogoutButton";

const linkClass =
  "inline-flex items-center justify-center rounded-full border border-[#5E704F] px-4 py-2 text-sm font-semibold text-[#5E704F] transition hover:bg-[#5E704F] hover:text-white";
const backClass =
  "inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50";

type ForbiddenCtasProps = {
  canAccessAdmin: boolean;
  canAccessOffice: boolean;
  showQaCabinetButton?: boolean;
};

export default function ForbiddenCtas({ 
  canAccessAdmin, 
  canAccessOffice,
  showQaCabinetButton = false,
}: ForbiddenCtasProps) {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <button type="button" className={backClass} onClick={handleBack}>
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
      {showQaCabinetButton && (
        <Link href="/cabinet?qa=resident_ok" className={linkClass} data-testid="forbidden-qa-cabinet">
          В кабинет (QA)
        </Link>
      )}
      <Link href="/" className={linkClass}>
        На сайт
      </Link>
      <GlobalLogoutButton />
    </div>
  );
}
