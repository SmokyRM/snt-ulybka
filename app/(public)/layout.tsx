import { Suspense } from "react";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import AssistantWidgetConditional from "@/components/AssistantWidgetConditional";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

// Отложенная загрузка feature flags - не блокирует первый экран
async function AssistantWidgetWrapper() {
  const flags = await getFeatureFlags().catch(() => null);
  const showWidget = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  const aiPersonalEnabled = flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false;
  
  if (!showWidget) return null;
  
  return (
    <AssistantWidgetConditional
      variant="public"
      initialRole={null}
      aiPersonalEnabled={aiPersonalEnabled}
    />
  );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Убрали await getFeatureFlags() из критического пути
  // AssistantWidget загружается под Suspense, не блокирует TTFB
  
  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <Header />
      <main className="pt-24">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <AssistantWidgetWrapper />
      </Suspense>
    </div>
  );
}
