"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Lazy load AssistantWidget - тяжелый компонент (~80KB)
// Не загружаем на страницах логина (не нужен там)
const AssistantWidget = dynamic(() => import("./AssistantWidget"), {
  ssr: false, // Client-only component
});

type AssistantWidgetConditionalProps = {
  variant?: "public" | "admin";
  initialAuth?: boolean;
  initialRole?: "guest" | "user" | "board" | "admin" | null;
  aiPersonalEnabled?: boolean;
};

export default function AssistantWidgetConditional(props: AssistantWidgetConditionalProps) {
  const pathname = usePathname();
  
  // Не грузить виджет на страницах логина (не нужен там)
  const isLoginPage = pathname?.startsWith("/login") || pathname?.startsWith("/staff-login");
  
  if (isLoginPage) {
    return null;
  }
  
  return <AssistantWidget {...props} />;
}
