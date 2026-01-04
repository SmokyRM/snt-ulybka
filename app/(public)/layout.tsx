import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import AssistantWidget from "@/components/AssistantWidget";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const flags = await getFeatureFlags().catch(() => null);
  const showWidget = flags ? isFeatureEnabled(flags, "ai_widget_enabled") : false;
  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <Header />
      <main className="pt-24">{children}</main>
      <Footer />
      {showWidget ? (
        <AssistantWidget
          variant="public"
          initialRole={null}
          aiPersonalEnabled={flags ? isFeatureEnabled(flags, "ai_personal_enabled") : false}
        />
      ) : null}
    </div>
  );
}
