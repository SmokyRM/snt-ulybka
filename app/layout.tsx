import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "СНТ «Улыбка» — официальный сайт",
  description:
    "Официальная информация, объявления и документы для членов СНТ «Улыбка».",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
