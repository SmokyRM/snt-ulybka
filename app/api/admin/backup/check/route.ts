export const runtime = "nodejs";

import { ok, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import { hasPgConnection } from "@/lib/auditLog.pg";
import { sql } from "@/db/client";
import { logAdminAction } from "@/lib/audit";
import { measure } from "@/lib/perf/measure";

type TableMetric = {
  table: string;
  count: number | null;
  ok: boolean;
  error?: string;
};

const KEY_TABLES = ["plots", "persons", "billing_payments", "billing_accruals", "office_jobs", "audit_log"];

export async function GET(request: Request) {
  return measure(
    "admin.backup.check",
    async () => {
      const guard = await requirePermission(request, "admin.access", {
        route: "/api/admin/backup/check",
        deniedReason: "admin.only",
      });
      if (guard instanceof Response) return guard;

      if (!hasPgConnection()) {
        await logAdminAction({
          action: "backup.check",
          entity: "backup",
          route: "/api/admin/backup/check",
          success: false,
          deniedReason: "POSTGRES_URL_MISSING",
          headers: request.headers,
        });
        return ok(request, {
          ok: false,
          error: "POSTGRES_URL missing",
          serverTime: null,
          tables: [] as TableMetric[],
        });
      }

      try {
        const nowRows = await sql<{ now: string }[]>`select now()::text as now`;
        const tableMetrics: TableMetric[] = [];

        for (const table of KEY_TABLES) {
          try {
            const rows = (await sql.unsafe(
              `select count(*)::int as total from "${table.replace(/"/g, "")}"`,
            )) as Array<{ total: number }>;
            tableMetrics.push({ table, count: rows[0]?.total ?? 0, ok: true });
          } catch (error) {
            tableMetrics.push({
              table,
              count: null,
              ok: false,
              error: error instanceof Error ? error.message : "count_failed",
            });
          }
        }

        const allOk = tableMetrics.every((metric) => metric.ok);

        await logAdminAction({
          action: "backup.check",
          entity: "backup",
          route: "/api/admin/backup/check",
          success: allOk,
          meta: {
            tablesChecked: tableMetrics.length,
            tablesFailed: tableMetrics.filter((metric) => !metric.ok).map((metric) => metric.table),
          },
          headers: request.headers,
        });

        return ok(request, {
          ok: allOk,
          serverTime: nowRows[0]?.now ?? null,
          tables: tableMetrics,
        });
      } catch (error) {
        return serverError(request, "Backup check failed", error);
      }
    },
    { route: "/api/admin/backup/check", method: "GET" },
  );
}
