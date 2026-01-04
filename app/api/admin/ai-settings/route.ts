import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isFeatureFlagsWritable, setFeatureFlag } from "@/lib/featureFlags";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isFeatureFlagsWritable()) {
    return NextResponse.json({ error: "Feature flags unavailable" }, { status: 503 });
  }
  let body: { enabled?: boolean };
  try {
    body = (await request.json()) as { enabled?: boolean };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const updated = await setFeatureFlag("ai_assistant_enabled", body.enabled);
  return NextResponse.json({ ok: true, enabled: updated.ai_assistant_enabled });
}
