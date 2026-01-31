import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { RouteLoaderProvider } from "@/components/RouteLoaderProvider";
import { ensureMockDbFromFile } from "@/lib/mockDbFile";
import { getSiteUrl } from "@/lib/siteUrl";
import { siteCity, siteName } from "@/config/site";
import "./globals.css";

// Оптимизированная загрузка шрифта через next/font
// Используем только необходимые начертания (400, 500, 600, 700)
// display: 'swap' включен по умолчанию в next/font
// preload: true для быстрой загрузки основных начертаний
const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"], // 400=normal, 500=medium, 600=semibold, 700=bold
  display: "swap", // font-display: swap для предотвращения FOIT
  preload: true, // Preload основных начертаний для LCP
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: `${siteName} — официальный сайт | ${siteCity}`,
  description:
    "Официальный сайт СНТ «Улыбка» (г. Снежинск). Сайт в стадии разработки, поэтапно запускаются разделы документов, оплат и личного кабинета.",
  metadataBase: getSiteUrl(),
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await ensureMockDbFromFile();
  const enableUx = process.env.NEXT_PUBLIC_ENABLE_UX === "1" || process.env.NODE_ENV !== "production";
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#F8F1E9] text-zinc-900 font-sans">
        {enableUx ? (
          <RouteLoaderProvider>
            {children}
          </RouteLoaderProvider>
        ) : (
          <>{children}</>
        )}
        <Analytics />
      </body>
    </html>
  );
}
