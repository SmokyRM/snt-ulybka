"use client";

import AuthCard from "./AuthCard";

export type NotFoundProps = {
  /** Custom title (default: "Страница не найдена"). */
  title?: string;
  /** Custom description. */
  description?: string;
};

/**
 * Full-page "Not Found" UI — shown for 404 errors.
 */
export default function NotFound({
  title = "Страница не найдена",
  description = "Запрошенная страница не существует или была удалена.",
}: NotFoundProps) {
  return (
    <AuthCard
      title={title}
      description={description}
      showStaffLogin={false}
      showResidentLogin={false}
      showHome
      showBack
    />
  );
}
