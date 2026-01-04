import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getFeatureFlags, setFeatureFlag } from "@/lib/featureFlags";
import { getAiSettings, setAiSettings, type AiSettings } from "@/lib/aiSettings";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: {
    key?: "ai_widget_enabled" | "ai_personal_enabled";
    enabled?: boolean;
    ai_widget_enabled?: boolean;
    ai_personal_enabled?: boolean;
    strictMode?: boolean;
    verbosity?: AiSettings["verbosity"];
    citations?: boolean;
    temperature?: AiSettings["temperature"];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const hasFlagUpdate =
    typeof body.ai_widget_enabled === "boolean" ||
    typeof body.ai_personal_enabled === "boolean" ||
    (body.key === "ai_widget_enabled" && typeof body.enabled === "boolean") ||
    (body.key === "ai_personal_enabled" && typeof body.enabled === "boolean");
  const hasSettingsUpdate =
    typeof body.strictMode === "boolean" ||
    typeof body.verbosity === "string" ||
    typeof body.citations === "boolean" ||
    typeof body.temperature === "string";
  if (!hasFlagUpdate && !hasSettingsUpdate) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  let flags = await getFeatureFlags();
  if (typeof body.ai_widget_enabled === "boolean") {
    flags = await setFeatureFlag("ai_widget_enabled", body.ai_widget_enabled);
  }
  if (typeof body.ai_personal_enabled === "boolean") {
    flags = await setFeatureFlag("ai_personal_enabled", body.ai_personal_enabled);
  }
  if (body.key === "ai_widget_enabled" && typeof body.enabled === "boolean") {
    flags = await setFeatureFlag("ai_widget_enabled", body.enabled);
  }
  if (body.key === "ai_personal_enabled" && typeof body.enabled === "boolean") {
    flags = await setFeatureFlag("ai_personal_enabled", body.enabled);
  }
  let settings = await getAiSettings();
  if (hasSettingsUpdate) {
    settings = await setAiSettings({
      strictMode: typeof body.strictMode === "boolean" ? body.strictMode : settings.strictMode,
      verbosity: typeof body.verbosity === "string" ? body.verbosity : settings.verbosity,
      citations: typeof body.citations === "boolean" ? body.citations : settings.citations,
      temperature: typeof body.temperature === "string" ? body.temperature : settings.temperature,
    });
  }
  return NextResponse.json({ ok: true, flags, settings });
}
