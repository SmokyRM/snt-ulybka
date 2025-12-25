import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/home/Header";
import Footer from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "СНТ «Улыбка» — официальный сайт",
  description:
    "Официальная информация, объявления и документы для членов СНТ «Улыбка».",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">
        <div className="min-h-screen bg-[#F8F1E9] text-zinc-900">
          <Header />
          <main className="pt-24">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
