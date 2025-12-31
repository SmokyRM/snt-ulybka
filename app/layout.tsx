import type { Metadata, Viewport } from "next";
import { RouteLoaderProvider } from "@/components/RouteLoaderProvider";
import { ensureMockDbFromFile } from "@/lib/mockDbFile";
import { siteCity, siteName } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteName} — официальный сайт | ${siteCity}`,
  description:
    "Официальный сайт СНТ «Улыбка» (г. Снежинск). Сайт в стадии разработки, поэтапно запускаются разделы документов, оплат и личного кабинета.",
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
    <html lang="ru">
      <body className="antialiased bg-[#F8F1E9] text-zinc-900">
        {enableUx ? (
          <RouteLoaderProvider>
            {children}
          </RouteLoaderProvider>
        ) : (
          <>{children}</>
        )}
      </body>
    </html>
  );
}
