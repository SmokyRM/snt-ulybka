export const runtime = "nodejs";

import { ok, fail, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { createMeeting, listMeetings, hasPgConnection } from "@/lib/meetings.pg";
import { logAdminAction } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings" });
    if (guard instanceof Response) return guard;
    if (!hasPgConnection()) return ok(request, { meetings: [] });
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");
    const meetings = await listMeetings({
      status: status ? (status as "draft" | "published" | "closed" | "archived") : null,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    return ok(request, { meetings });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await requirePermission(request, "meetings.manage", { route: "/api/office/meetings" });
    if (guard instanceof Response) return guard;
    if (!hasPgConnection()) return fail(request, "pg_missing", "Postgres не настроен", 503);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return fail(request, "validation_error", "Invalid payload", 400);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const type = body.type === "board" || body.type === "extra" ? body.type : "general";
    const startsAt = typeof body.startsAt === "string" ? body.startsAt : null;
    const endsAt = typeof body.endsAt === "string" ? body.endsAt : null;
    if (!title) return fail(request, "validation_error", "title is required", 400);

    const meeting = await createMeeting({
      title,
      type,
      startsAt,
      endsAt,
      createdBy: guard.session.id ?? null,
    });

    await logAdminAction({
      action: "meetings.create",
      entity: "meetings",
      entityId: meeting.id,
      after: { title: meeting.title, type: meeting.type, status: meeting.status },
      headers: request.headers,
    });

    return ok(request, { meeting }, { status: 201 });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
