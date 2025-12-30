import { NextResponse } from "next/server";
import { getFeatureFlags, setFeatureFlag, FeatureFlagKey } from "@/lib/featureFlags";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const flags = await getFeatureFlags();
  return NextResponse.json({ flags });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const key = body.key as FeatureFlagKey | undefined;
  const value = body.value;
  if (!key || typeof value !== "boolean") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const flags = await setFeatureFlag(key, value);
  return NextResponse.json({ flags });
}
