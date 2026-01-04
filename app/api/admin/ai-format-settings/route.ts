import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
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
    ai_answer_style?: AiSettings["ai_answer_style"];
    ai_tone?: AiSettings["ai_tone"];
    ai_show_sources?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const hasUpdate =
    typeof body.ai_show_sources === "boolean" ||
    typeof body.ai_answer_style === "string" ||
    typeof body.ai_tone === "string";
  if (!hasUpdate) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const current = await getAiSettings();
  const updated = await setAiSettings({
    ai_answer_style: body.ai_answer_style ?? current.ai_answer_style,
    ai_tone: body.ai_tone ?? current.ai_tone,
    ai_show_sources:
      typeof body.ai_show_sources === "boolean" ? body.ai_show_sources : current.ai_show_sources,
  });
  return NextResponse.json({ ok: true, settings: updated });
}
