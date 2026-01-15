import { Suspense } from "react";
import { cookies } from "next/headers";
import HomeOld from "./home/HomeOld";
import HomeNew from "./home/HomeNew";
import { getFeatureFlags, isFeatureEnabled, type FeatureFlags } from "@/lib/featureFlags";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";
import { getPublicContent } from "@/lib/publicContentStore";

// Убрано force-dynamic для оптимизации TTFB
// Страница может быть статичной с ISR (Incremental Static Regeneration)
// export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalidate каждые 60 секунд
export const metadata = {
  alternates: {
    canonical: "/",
  },
};

const fallbackFlags: FeatureFlags = {
  newPublicHome: false,
  debtsV2: false,
  cabinetMvp: false,
  forceNewHome: false,
  ai_widget_enabled: false,
  ai_personal_enabled: false,
};

// Fallback для первого экрана - показываем сразу без данных
function HomeFallback() {
  return <HomeOld content={PUBLIC_CONTENT_DEFAULTS} />;
}

// Динамический контент под Suspense - не блокирует TTFB
async function HomeContent() {
  // Параллельные async вызовы для уменьшения TTFB
  const [contentResult, flagsResult] = await Promise.allSettled([
    getPublicContent(),
    getFeatureFlags(),
  ]);

  let content = PUBLIC_CONTENT_DEFAULTS;
  let flags = fallbackFlags;

  if (contentResult.status === "fulfilled") {
    content = contentResult.value;
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[home] public content fallback", contentResult.reason);
    }
  }

  if (flagsResult.status === "fulfilled") {
    flags = flagsResult.value;
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[home] feature flags fallback", flagsResult.reason);
    }
  }
  
  const flagOn = isFeatureEnabled(flags, "newPublicHome");
  const forceNew = isFeatureEnabled(flags, "forceNewHome");
  
  // Читаем cookie для beta_home (быстро, не блокирует)
  const cookieStore = await Promise.resolve(cookies());
  const betaCookie = cookieStore.get("beta_home")?.value;
  const useNew = betaCookie === "1";

  // Определяем, какую версию показывать
  if (!flagOn) {
    return <HomeOld content={content} />;
  }
  if (forceNew) {
    return <HomeNew content={content} />;
  }
  if (useNew) {
    return <HomeNew content={content} />;
  }
  return <HomeOld content={content} />;
}

export default function Home() {
  // Выносим данные под Suspense - не блокирует TTFB
  // Показываем fallback сразу, данные подгрузятся асинхронно
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
