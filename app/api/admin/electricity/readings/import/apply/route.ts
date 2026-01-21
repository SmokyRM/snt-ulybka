import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listAllMeters, getLastMeterReading, addMeterReading } from "@/lib/mockDb";
import { logAdminAction } from "@/lib/audit";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      rows?: Array<{
        plotId: string;
        meterNumber?: string;
        readingDate: string;
        value: number;
      }>;
    };

    if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
      return badRequest(request, "Нет данных для импорта");
    }

    const allMeters = listAllMeters().filter((m) => m.active);
    const results: Array<{
      row: number;
      success: boolean;
      readingId?: string;
      error?: string;
    }> = [];

    for (const row of body.rows) {
      const meter = allMeters.find(
        (m) => m.plotId === row.plotId && (!row.meterNumber || m.meterNumber === row.meterNumber)
      );

      if (!meter) {
        results.push({
          row: results.length + 1,
          success: false,
          error: "Счётчик не найден",
        });
        continue;
      }

      const lastReading = getLastMeterReading(meter.id);
      if (lastReading && row.value < lastReading.value) {
        results.push({
          row: results.length + 1,
          success: false,
          error: `Показание меньше предыдущего (${lastReading.value})`,
        });
        continue;
      }

      try {
        const reading = addMeterReading({
          meterId: meter.id,
          readingDate: row.readingDate.includes("T") ? row.readingDate : `${row.readingDate}T00:00:00.000Z`,
          value: row.value,
          source: "import",
          createdByUserId: user.id,
        });

        await logAdminAction({
          action: "import_meter_reading",
          entity: "meter_reading",
          entityId: reading.id,
          after: {
            reading,
            previousValue: lastReading?.value ?? null,
            delta: lastReading ? row.value - lastReading.value : row.value,
            importedBy: user.id,
            importedByRole: user.role,
          },
          headers: request.headers,
        });

        results.push({
          row: results.length + 1,
          success: true,
          readingId: reading.id,
        });
      } catch (e) {
        results.push({
          row: results.length + 1,
          success: false,
          error: (e as Error).message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return ok(request, {
      results,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
