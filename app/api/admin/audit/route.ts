import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listAuditLogs } from "@/lib/mockDb";

const parseFilters = (request: Request) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  const action = params.get("action");
  const from = params.get("from");
  const to = params.get("to");
  const limitRaw = params.get("limit");
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : 50;
  return {
    action: action || undefined,
    from: from || undefined,
    to: to || undefined,
    limit: Number.isFinite(limit) ? limit : 50,
  };
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminAccess(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const filters = parseFilters(request);
  const logs = listAuditLogs(filters);
  return NextResponse.json({ logs });
}
