import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";
import AssistantWidget from "@/components/AssistantWidget";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <Header />
      <main className="pt-24">{children}</main>
      <Footer />
      <AssistantWidget variant="public" />
    </div>
  );
}
