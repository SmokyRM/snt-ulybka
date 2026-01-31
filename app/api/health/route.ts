import { ok } from "@/lib/api/respond";
import { getMetricsSnapshot } from "@/lib/metrics";

export async function GET(request: Request) {
  const uptime = process.uptime();
  const timestamp = new Date().toISOString();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? null;
  const gitSha = process.env.GIT_SHA ?? null;

  return ok(request, {
    status: "ok",
    timestamp,
    uptimeSeconds: Math.round(uptime),
    version,
    gitSha,
    metrics: getMetricsSnapshot(),
  });
}
