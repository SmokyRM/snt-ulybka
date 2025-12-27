import type { Metadata, Viewport } from "next";
import { RouteLoaderProvider } from "@/components/RouteLoaderProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "СНТ «Улыбка» — официальный сайт",
  description: "Официальная информация, объявления и документы для членов СНТ «Улыбка».",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
