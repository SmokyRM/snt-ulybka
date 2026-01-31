import { ok, forbidden, fail, serverError, methodNotAllowed } from "@/lib/api/respond";
import { runJobs, type JobName } from "@/server/jobs";

const VALID_TASKS: JobName[] = ["overdue", "outbox", "digest"];

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (isVercelCron) return true;
  if (!cronSecret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    if (request.method !== "GET") {
      return methodNotAllowed(request, ["GET"]);
    }
    if (!isAuthorized(request)) {
      return forbidden(request, "Cron unauthorized");
    }
    const url = new URL(request.url);
    const raw = url.searchParams.get("task");
    const tasks = raw
      ? raw
          .split(",")
          .map((t) => t.trim())
          .filter((t): t is JobName => VALID_TASKS.includes(t as JobName))
      : undefined;
    if (raw && (!tasks || tasks.length === 0)) {
      return fail(request, "bad_request", "Unknown task", 400);
    }
    const result = await runJobs(tasks);
    return ok(request, result);
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
