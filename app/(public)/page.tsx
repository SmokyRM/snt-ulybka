import { cookies } from "next/headers";
import HomeOld from "./home/HomeOld";
import HomeNew from "./home/HomeNew";
import { getFeatureFlags, isFeatureEnabled, type FeatureFlags } from "@/lib/featureFlags";
import { incrementHomeView, type HomeViewKey } from "@/lib/homeViews";
import { PUBLIC_CONTENT_DEFAULTS } from "@/lib/publicContentDefaults";
import { getPublicContent } from "@/lib/publicContentStore";

export const dynamic = "force-dynamic";
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
};

export default async function Home() {
  let content = PUBLIC_CONTENT_DEFAULTS;
  let flags = fallbackFlags;
  try {
    content = await getPublicContent();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[home] public content fallback", error);
    }
  }
  try {
    flags = await getFeatureFlags();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[home] feature flags fallback", error);
    }
  }
  const flagOn = isFeatureEnabled(flags, "newPublicHome");
  const forceNew = isFeatureEnabled(flags, "forceNewHome");
  const safeIncrement = async (key: HomeViewKey) => {
    try {
      await incrementHomeView(key);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[home] view increment failed", error);
      }
    }
  };
  if (!flagOn) return <HomeOld content={content} />;
  if (forceNew) {
    await safeIncrement("homeNew");
    return <HomeNew content={content} />;
  }

  const cookieStore = await Promise.resolve(cookies());
  const betaCookie = cookieStore.get("beta_home")?.value;
  const useNew = betaCookie === "1";

  if (useNew) {
    await safeIncrement("homeNew");
    return <HomeNew content={content} />;
  }
  await safeIncrement("homeOld");
  return <HomeOld content={content} />;
}
