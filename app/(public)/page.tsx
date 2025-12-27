import { cookies } from "next/headers";
import HomeOld from "./home/HomeOld";
import HomeNew from "./home/HomeNew";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";
import { incrementHomeView } from "@/lib/homeViews";
import { getPublicContent } from "@/lib/publicContentStore";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getPublicContent();
  const flags = await getFeatureFlags();
  const flagOn = isFeatureEnabled(flags, "newPublicHome");
  const forceNew = isFeatureEnabled(flags, "forceNewHome");
  if (!flagOn) return <HomeOld content={content} />;
  if (forceNew) {
    await incrementHomeView("homeNew");
    return <HomeNew content={content} />;
  }

  const cookieStore = await Promise.resolve(cookies());
  const betaCookie = cookieStore.get("beta_home")?.value;
  const useNew = betaCookie === "1";

  if (useNew) {
    await incrementHomeView("homeNew");
    return <HomeNew content={content} />;
  }
  await incrementHomeView("homeOld");
  return <HomeOld content={content} />;
}
