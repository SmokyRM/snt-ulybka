"use client";

import AuthCard from "./AuthCard";

export type LoginRequiredProps = {
  /** The path user was trying to access (for next= param). */
  nextPath?: string | null;
  /** Extra hint text below description. */
  hint?: string;
  /** Show staff login button (default: true). */
  showStaffLogin?: boolean;
  /** Show resident login button (default: true). */
  showResidentLogin?: boolean;
};

/**
 * Full-page "Login Required" UI — shown when user accesses a protected
 * page without a valid session.
 */
export default function LoginRequired({
  nextPath,
  hint,
  showStaffLogin = true,
  showResidentLogin = true,
}: LoginRequiredProps) {
  return (
    <AuthCard
      title="Требуется вход"
      description="Для доступа к этой странице необходимо войти в систему."
      hint={hint}
      showStaffLogin={showStaffLogin}
      showResidentLogin={showResidentLogin}
      showHome
      showBack
      nextPath={nextPath}
    />
  );
}
