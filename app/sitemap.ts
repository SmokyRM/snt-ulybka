import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

const publicRoutes = [
  "/",
  "/about",
  "/access",
  "/contacts",
  "/docs",
  "/documents",
  "/electricity",
  "/fees",
  "/help",
  "/reports",
  "/reports/goals",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  return publicRoutes.map((route) => ({
    url: new URL(route, baseUrl).toString(),
  }));
}
