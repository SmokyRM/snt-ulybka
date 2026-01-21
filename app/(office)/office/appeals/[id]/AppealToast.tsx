"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const messages: Record<string, string> = {
  taken: "Обращение взято в работу",
  clarify: "Запрошено уточнение",
  closed: "Обращение закрыто",
};

export default function AppealToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams?.get("success");
  const hasMessage = Boolean(success && messages[success]);

  useEffect(() => {
    if (!hasMessage) return;

    const timer = setTimeout(() => {
      // Убираем параметр success из URL
      const newParams = new URLSearchParams(searchParams?.toString());
      newParams.delete("success");
      const newUrl = newParams.toString() ? `?${newParams.toString()}` : "";
      router.replace(`/office/appeals/${window.location.pathname.split("/").pop()}${newUrl}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [hasMessage, searchParams, router]);

  if (!hasMessage || !success || !messages[success]) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2">
      <div className="rounded-lg bg-[#5E704F] px-4 py-3 text-sm font-semibold text-white shadow-lg">
        {messages[success]}
      </div>
    </div>
  );
}
