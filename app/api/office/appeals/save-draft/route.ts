import { NextResponse } from "next/server";
import { getEffectiveSessionUser } from "@/lib/session.server";
import { saveAppealReplyDraft } from "@/lib/office/appeals.server";
import { hasPermission, isOfficeRole } from "@/lib/rbac";

export async function POST(request: Request) {
  const session = await getEffectiveSessionUser();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.role;
  if (!isOfficeRole(role) || !hasPermission(role, "appeals.manage")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: string; text?: string; category?: string; tone?: string }
    | null;
  if (!body?.id || !body.text || !body.category || !body.tone) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const updated = saveAppealReplyDraft(body.id, { text: body.text, category: body.category, tone: body.tone }, role === "admin" ? "admin" : role);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, replyDraft: updated.replyDraft });
}
