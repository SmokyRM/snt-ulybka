import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  experimental: {
    // Dev-кэш Turbopack: единственный поддерживаемый ключ в Next.js 16.1.1 —
    // turbopackFileSystemCacheForDev. (turbopackPersistentCaching, isrMemoryCacheSize удалены.)
    // false — избегаем LevelDB "Another write batch or compaction is already active" при hot-reload.
    turbopackFileSystemCacheForDev: false,
  },
};

export default bundleAnalyzer(nextConfig);
