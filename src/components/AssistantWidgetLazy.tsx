"use client";

import dynamic from "next/dynamic";

// Lazy load AssistantWidget - тяжелый компонент (~80KB)
const AssistantWidget = dynamic(() => import("./AssistantWidget"), {
  ssr: false, // Client-only component
});

type AssistantWidgetLazyProps = {
  variant?: "public" | "admin";
  initialAuth?: boolean;
  initialRole?: "guest" | "user" | "board" | "admin" | null;
  aiPersonalEnabled?: boolean;
};

export default function AssistantWidgetLazy(props: AssistantWidgetLazyProps) {
  return <AssistantWidget {...props} />;
}
