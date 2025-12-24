import Contacts from "@/components/home/Contacts";
import DocsPreview from "@/components/home/DocsPreview";
import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import Important from "@/components/home/Important";
import NewsPreview from "@/components/home/NewsPreview";
import Payments from "@/components/home/Payments";
import QuickLinks from "@/components/home/QuickLinks";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
      <Header />
      <main>
        <Hero />
        <Important />
        <QuickLinks />
        <Payments />
        <NewsPreview />
        <DocsPreview />
        <Contacts />
      </main>
      <Footer />
    </div>
  );
}
