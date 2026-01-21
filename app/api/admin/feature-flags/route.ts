import { ok, fail, forbidden } from "@/lib/api/respond";
import { getFeatureFlags, setFeatureFlag, FeatureFlagKey } from "@/lib/featureFlags";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) return forbidden(request);
  const flags = await getFeatureFlags();
  return ok(request, { flags });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) return forbidden(request);
  const body = await request.json().catch(() => ({}));
  const key = body.key as FeatureFlagKey | undefined;
  const value = body.value;
  if (!key || typeof value !== "boolean") {
    return fail(request, "validation_error", "Неверный формат данных", 400);
  }
  const flags = await setFeatureFlag(key, value);
  return ok(request, { flags });
}
