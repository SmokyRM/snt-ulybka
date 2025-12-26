import { cookies } from "next/headers";
import HomeOld from "./home/HomeOld";
import HomeNew from "./home/HomeNew";
import { getFeatureFlags, isFeatureEnabled } from "@/lib/featureFlags";

export const dynamic = "force-dynamic";

export default async function Home() {
  const flags = await getFeatureFlags();
  const flagOn = isFeatureEnabled(flags, "newPublicHome");
  if (!flagOn) return <HomeOld />;

  const cookieStore = await Promise.resolve(cookies());
  const betaCookie = cookieStore.get("beta_home")?.value;
  const useNew = betaCookie === "1";

  return useNew ? <HomeNew /> : <HomeOld />;
}
