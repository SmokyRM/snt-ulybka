import { ok, unauthorized, forbidden } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { listOfficeJobsAll } from "@/lib/office/jobs.store";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }

  const since24h = Date.now() - 24 * 60 * 60 * 1000;
  const items = (await listOfficeJobsAll())
    .filter((job) => job.status === "failed" && job.error)
    .filter((job) => Date.parse(job.updatedAt) >= since24h)
    .map((job) => ({
      id: job.id,
      type: job.type,
      status: job.status,
      error: job.error,
      attempts: job.attempts,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));

  return ok(request, { items });
}
