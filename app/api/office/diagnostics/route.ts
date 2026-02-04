export const runtime = "nodejs";

import { ok } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { sql } from "@/db/client";
import { getMetricsSnapshot } from "@/lib/metrics";
import { hasPgConnection } from "@/lib/registry/pg";

type TableStatus = {
  ok: boolean;
  missing: string[];
  present: string[];
  error?: string;
};

const REQUIRED_TABLES = [
  "audit_log",
  "billing_payments",
  "billing_accruals",
  "billing_allocations",
  "billing_period_close",
  "ownership_verifications",
  "office_jobs",
];

export async function GET(request: Request) {
  const guard = await requirePermission(request, "diagnostics.view", {
    route: "/api/office/diagnostics",
    deniedReason: "diagnostics.view",
  });
  if (guard instanceof Response) return guard;

  const hasDb = hasPgConnection();
  const envPicked =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    null;

  let ping: { ok: boolean; ms: number | null; error?: string } = {
    ok: false,
    ms: null,
    error: hasDb ? undefined : "POSTGRES_URL missing",
  };
  let tables: TableStatus = { ok: false, missing: [...REQUIRED_TABLES], present: [] };
  let jobsFailed = { last24h: 0, recent: [] as Array<{ id: string; type: string; error: string | null; updatedAt: string }> };

  if (hasDb) {
    try {
      const started = Date.now();
      await sql`select 1 as ok`;
      ping = { ok: true, ms: Date.now() - started };
    } catch (error) {
      ping = { ok: false, ms: null, error: error instanceof Error ? error.message : "DB ping failed" };
    }

    try {
      const rows = await sql<{ table_name: string }[]>`
        select table_name
        from information_schema.tables
        where table_schema = 'public'
      `;
      const presentSet = new Set(rows.map((row: { table_name: string }) => row.table_name));
      const present = REQUIRED_TABLES.filter((t) => presentSet.has(t));
      const missing = REQUIRED_TABLES.filter((t) => !presentSet.has(t));
      tables = { ok: missing.length === 0, missing, present };
    } catch (error) {
      tables = {
        ok: false,
        missing: [...REQUIRED_TABLES],
        present: [],
        error: error instanceof Error ? error.message : "Table check failed",
      };
    }

    if (tables.present.includes("office_jobs")) {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const countRows = await sql<{ total: number }[]>`
          select count(*)::int as total
          from office_jobs
          where status = 'failed' and updated_at >= ${since}
        `;
        const recentRows = await sql<
          {
            id: string;
            type: string;
            error_message: string | null;
            updated_at: string;
          }[]
        >`
          select id, type, error_message, updated_at
          from office_jobs
          where status = 'failed'
          order by updated_at desc
          limit 10
        `;
        jobsFailed = {
          last24h: countRows[0]?.total ?? 0,
          recent: recentRows.map((row: { id: string; type: string; error_message: string | null; updated_at: string }) => ({
            id: row.id,
            type: row.type,
            error: row.error_message,
            updatedAt: row.updated_at,
          })),
        };
      } catch {
        // ignore job table errors
      }
    }
  }

  const metrics = getMetricsSnapshot();
  const slowOpsCount = Object.values(metrics.timings).filter((value) => typeof value === "number" && value >= 800).length;

  return ok(request, {
    env: {
      hasPostgresUrl: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
      hasNonPooling: Boolean(process.env.POSTGRES_URL_NON_POOLING),
      picked: envPicked ? "configured" : null,
    },
    ping,
    tables,
    jobsFailed,
    ownership: { source: hasDb ? "postgres" : "mock" },
    perf: { slowOpsCount },
    version: {
      commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || null,
      build: process.env.BUILD_ID || null,
      app: process.env.npm_package_version || null,
    },
  });
}
