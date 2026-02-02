import { ok, unauthorized, forbidden } from "@/lib/api/respond";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { getDb, getSetting } from "@/lib/mockDb";
import { formatAdminTime } from "@/lib/settings.shared";
import { listOfficeJobsAll } from "@/lib/office/jobs.store";
import { listErrorEvents, countErrorEvents } from "@/lib/errorEvents.store";
import { listLoginAudit } from "@/lib/loginAudit.store";
import { getAuditLogSummary } from "@/lib/auditLog.store";
import { logAdminAction } from "@/lib/audit";
import { listAppeals } from "@/lib/appeals.store";

const formatLocal = (date: Date) => formatAdminTime(date.toISOString());

const pingDb = async () => {
  const started = Date.now();
  try {
    // Lightweight read from in-memory mock DB
    const requisites = getSetting("payment_details");
    const latencyMs = Date.now() - started;
    return { ok: true, latencyMs, sample: requisites?.key };
  } catch (error) {
    const latencyMs = Date.now() - started;
    return { ok: false, latencyMs, error: (error as Error).message };
  }
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return unauthorized(request);
  }
  if (!hasAdminAccess(user)) {
    return forbidden(request);
  }

  const now = new Date();
  const db = await pingDb();
  const sessionOk = Boolean(user);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const requisites = getSetting("payment_details");
  const social = getSetting("official_channels");

  const jobs = await listOfficeJobsAll();
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const failedJobs24h = jobs.filter(
    (job) => job.status === "failed" && Date.parse(job.updatedAt) >= Date.parse(since24h),
  );

  const lastErrors = listErrorEvents({ limit: 10 });
  const loginAudit = listLoginAudit({ limit: 1 });
  const auditLogSummary = getAuditLogSummary();
  const appealsCount = listAppeals({ q: undefined }).length;
  const storage = getDb();

  const buildInfo = {
    commitHash: process.env.VERCEL_GIT_COMMIT_SHA || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    buildTime: process.env.VERCEL_DEPLOYMENT_ID || null,
  };

  await logAdminAction({
    action: "health.view",
    entity: "admin.health",
    route: "/api/admin/health",
    success: true,
    headers: request.headers,
  });

  return ok(request, {
    ok: db.ok && sessionOk,
    serverTimeIso: now.toISOString(),
    serverTimeLocalFormatted: formatLocal(now),
    uptimeSeconds: Math.round(process.uptime()),
    buildInfo,
    db,
    session: { ok: sessionOk },
    jobs: {
      running: runningJobs,
      failedLast24h: failedJobs24h.length,
      failedItems: failedJobs24h.slice(0, 20).map((job) => ({
        id: job.id,
        type: job.type,
        error: job.error,
        attempts: job.attempts,
        updatedAt: job.updatedAt,
      })),
    },
    lastUpdates: {
      requisitesUpdatedAt: requisites?.updatedAt ?? null,
      socialLinksUpdatedAt: social?.updatedAt ?? null,
    },
    recentErrors: lastErrors,
    storage: {
      users: storage.users.length,
      plots: storage.plots.length,
      payments: storage.payments.length,
      appeals: appealsCount,
      auditLogs: storage.auditLogs.length,
      auditLogEntries: auditLogSummary.total,
      officeJobs: jobs.length,
      loginAudit: loginAudit.total,
      errorEvents: countErrorEvents(),
    },
  });
}
