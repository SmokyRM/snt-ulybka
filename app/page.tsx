import Contacts from "@/components/home/Contacts";
import DocsPreview from "@/components/home/DocsPreview";
import Hero from "@/components/home/Hero";
import Important from "@/components/home/Important";
import NewsPreview from "@/components/home/NewsPreview";
import Payments from "@/components/home/Payments";
import QuickLinks from "@/components/home/QuickLinks";

export default function Home() {
  return (
    <>
      <Hero />
      <Important />
      <QuickLinks />
      <Payments />
      <NewsPreview />
      <DocsPreview />
      <Contacts />
    </>
  );
}
