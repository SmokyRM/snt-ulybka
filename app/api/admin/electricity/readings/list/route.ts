import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listAllMeters, listMeterReadings, findPlotById, findUserById } from "@/lib/mockDb";
import type { MeterReading, ElectricityMeter } from "@/types/snt";
import { forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const url = new URL(request.url);
    const periodFrom = url.searchParams.get("periodFrom");
    const periodTo = url.searchParams.get("periodTo");
    const street = url.searchParams.get("street");
    const plotNumber = url.searchParams.get("plotNumber");
    const anomalies = url.searchParams.get("anomalies") === "true";

    // Get all meters with their readings
    const allMeters = listAllMeters().filter((m) => m.active);
    const allReadings: Array<MeterReading & { 
      meter: ElectricityMeter; 
      plot?: { street?: string; plotNumber?: string; ownerFullName?: string | null } | null;
      createdBy?: { id: string; fullName?: string | null; role?: string } | null;
    }> = [];

    for (const meter of allMeters) {
      const plot = findPlotById(meter.plotId);
      const readings = listMeterReadings(meter.id);
      
      for (const reading of readings) {
        // Apply filters
        if (periodFrom && reading.readingDate < periodFrom) continue;
        if (periodTo && reading.readingDate > periodTo) continue;
        if (street && !plot?.street?.toLowerCase().includes(street.toLowerCase())) continue;
        if (plotNumber && !plot?.plotNumber?.includes(plotNumber)) continue;

        const createdByUser = reading.createdByUserId ? findUserById(reading.createdByUserId) : null;
        
        allReadings.push({
          ...reading,
          meter,
          plot: plot ? {
            street: plot.street,
            plotNumber: plot.plotNumber,
            ownerFullName: plot.ownerFullName,
          } : null,
          createdBy: createdByUser ? {
            id: createdByUser.id,
            fullName: createdByUser.fullName || null,
            role: createdByUser.role || null,
          } : null,
        });
      }
    }

    // Sort by date descending
    allReadings.sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime());

    // Detect anomalies: negative consumption or very high consumption
    let filteredReadings = allReadings;
    if (anomalies) {
      filteredReadings = allReadings.filter((reading) => {
        const meterReadings = listMeterReadings(reading.meterId).sort((a, b) => 
          new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
        );
        const readingIdx = meterReadings.findIndex((r) => r.id === reading.id);
        if (readingIdx === 0) return false; // First reading, no anomaly
        
        const prevReading = meterReadings[readingIdx - 1];
        const consumption = reading.value - prevReading.value;
        
        // Anomaly: negative consumption or > 10000 kWh (unrealistic)
        return consumption < 0 || consumption > 10000;
      });
    }

    // Enrich with previous reading and consumption
    const enriched = filteredReadings.map((reading) => {
      const meterReadings = listMeterReadings(reading.meterId).sort((a, b) => 
        new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
      );
      const readingIdx = meterReadings.findIndex((r) => r.id === reading.id);
      const prevReading = readingIdx > 0 ? meterReadings[readingIdx - 1] : null;
      const consumption = prevReading ? reading.value - prevReading.value : null;

      return {
        ...reading,
        previousReading: prevReading ? { value: prevReading.value, readingDate: prevReading.readingDate } : null,
        consumption,
        status: consumption !== null && consumption < 0 ? "anomaly" : consumption !== null && consumption > 10000 ? "suspicious" : "normal",
      };
    });

    return ok(request, { readings: enriched });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
