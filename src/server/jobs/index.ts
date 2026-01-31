import "server-only";

import { checkAndNotifyOverdue } from "@/server/services/notificationsOverdue";
import { sendDailyDigest } from "@/server/services/notifications";
import { processOutbox, retryFailedOutbox } from "@/lib/appeals.store";
import { incMetric } from "@/lib/metrics";
import type { Role } from "@/lib/permissions";

export type JobName = "overdue" | "outbox" | "digest";

export type JobResult = {
  job: JobName;
  ok: boolean;
  details: Record<string, unknown>;
};

const DIGEST_ROLES: Role[] = ["chairman", "secretary", "accountant", "admin"];

export async function runOverdueJob(): Promise<JobResult> {
  const result = await checkAndNotifyOverdue();
  incMetric("jobs.overdue.runs", 1);
  return { job: "overdue", ok: true, details: result };
}

export async function runOutboxJob(): Promise<JobResult> {
  const retry = retryFailedOutbox({ limit: 50, maxAttempts: 3 });
  const processed = await processOutbox({ limit: 50 });
  incMetric("jobs.outbox.runs", 1);
  return { job: "outbox", ok: true, details: { retry, processed } };
}

export async function runDigestJob(): Promise<JobResult> {
  const summary = { sent: 0, failed: 0 };
  for (const role of DIGEST_ROLES) {
    const result = await sendDailyDigest(role);
    summary.sent += result.sent;
    summary.failed += result.failed;
  }
  incMetric("jobs.digest.runs", 1);
  return { job: "digest", ok: true, details: summary };
}

export async function runJobs(tasks?: JobName[]): Promise<{ results: JobResult[] }> {
  const queue: JobName[] = tasks && tasks.length ? tasks : ["overdue", "outbox", "digest"];
  const results: JobResult[] = [];

  for (const job of queue) {
    if (job === "overdue") {
      results.push(await runOverdueJob());
    } else if (job === "outbox") {
      results.push(await runOutboxJob());
    } else if (job === "digest") {
      results.push(await runDigestJob());
    }
  }

  return { results };
}
