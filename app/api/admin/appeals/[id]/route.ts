import { NextResponse } from "next/server";
import { updateAppealStatus, AppealStatus } from "@/lib/appeals";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const status = body.status as AppealStatus | undefined;
  const adminReply = typeof body.adminReply === "string" ? body.adminReply : undefined;
  if (!status) {
    return NextResponse.json({ error: "status_required" }, { status: 400 });
  }
  const updated = await updateAppealStatus(
    params.id,
    status,
    adminReply,
    {
      id: user?.id,
      role: user?.role,
    },
  );
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, appeal: updated });
}
