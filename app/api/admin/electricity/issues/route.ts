import { getSessionUser } from "@/lib/session.server";
import { checkAdminOrOfficeAccess } from "@/lib/rbac/accessCheck";
import { listAllMeters, listMeterReadings, findPlotById } from "@/lib/mockDb";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

// Константа для определения аномального скачка (кВт·ч)
const ANOMALY_THRESHOLD_KWH = 5000;

type IssueType = "missing_readings" | "no_previous" | "negative_consumption" | "anomaly_spike";

export interface ElectricityIssue {
  type: IssueType;
  plotId: string;
  meterId: string;
  meterNumber?: string | null;
  street?: string;
  plotNumber?: string;
  ownerFullName?: string | null;
  description: string;
  details?: {
    lastReadingDate?: string | null;
    lastReadingValue?: number | null;
    currentReadingDate?: string | null;
    currentReadingValue?: number | null;
    consumption?: number | null;
    period?: string;
  };
}

export async function GET(request: Request) {
  const accessCheck = await checkAdminOrOfficeAccess(request);
  if (!accessCheck.allowed) {
    return accessCheck.reason === "unauthorized" ? unauthorized(request) : forbidden(request);
  }
  
  await getSessionUser();

  const url = new URL(request.url);
  const issueType = url.searchParams.get("type") as IssueType | null;
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const month = Number(url.searchParams.get("month") ?? new Date().getMonth() + 1);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return badRequest(request, "Неверный период");
  }

  try {
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const allMeters = listAllMeters().filter((m) => m.active);
    const issues: ElectricityIssue[] = [];

    for (const meter of allMeters) {
      const plot = findPlotById(meter.plotId);
      const readings = listMeterReadings(meter.id).sort((a, b) => 
        new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
      );

    // 1. Пропуски показаний - нет показаний за период
    const readingsInPeriod = readings.filter((r) => {
      const date = new Date(r.readingDate);
      return date >= periodStart && date <= periodEnd;
    });
    if (readingsInPeriod.length === 0 && (!issueType || issueType === "missing_readings")) {
      issues.push({
        type: "missing_readings",
        plotId: meter.plotId,
        meterId: meter.id,
        meterNumber: meter.meterNumber,
        street: plot?.street,
        plotNumber: plot?.plotNumber,
        ownerFullName: plot?.ownerFullName,
        description: "Нет показаний за период",
        details: {
          lastReadingDate: readings.length > 0 ? readings[readings.length - 1].readingDate : null,
          lastReadingValue: readings.length > 0 ? readings[readings.length - 1].value : null,
          period: `${year}-${month.toString().padStart(2, "0")}`,
        },
      });
    }

    // 2. Нет предыдущих показаний - первое показание
    if (readings.length === 1 && (!issueType || issueType === "no_previous")) {
      issues.push({
        type: "no_previous",
        plotId: meter.plotId,
        meterId: meter.id,
        meterNumber: meter.meterNumber,
        street: plot?.street,
        plotNumber: plot?.plotNumber,
        ownerFullName: plot?.ownerFullName,
        description: "Нет предыдущих показаний для расчёта потребления",
        details: {
          currentReadingDate: readings[0].readingDate,
          currentReadingValue: readings[0].value,
        },
      });
    }

    // 3. Отрицательное потребление и 4. Аномальный скачок
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const curr = readings[i];
      const consumption = curr.value - prev.value;

      // Проверяем период - только показания в выбранном периоде или после него
      const currDate = new Date(curr.readingDate);
      if (currDate < periodStart) continue;

      if (consumption < 0 && (!issueType || issueType === "negative_consumption")) {
        issues.push({
          type: "negative_consumption",
          plotId: meter.plotId,
          meterId: meter.id,
          meterNumber: meter.meterNumber,
          street: plot?.street,
          plotNumber: plot?.plotNumber,
          ownerFullName: plot?.ownerFullName,
          description: "Отрицательное потребление",
          details: {
            lastReadingDate: prev.readingDate,
            lastReadingValue: prev.value,
            currentReadingDate: curr.readingDate,
            currentReadingValue: curr.value,
            consumption,
          },
        });
      }

      if (consumption > ANOMALY_THRESHOLD_KWH && (!issueType || issueType === "anomaly_spike")) {
        issues.push({
          type: "anomaly_spike",
          plotId: meter.plotId,
          meterId: meter.id,
          meterNumber: meter.meterNumber,
          street: plot?.street,
          plotNumber: plot?.plotNumber,
          ownerFullName: plot?.ownerFullName,
          description: `Аномальный скачок: ${consumption.toFixed(2)} кВт·ч (порог: ${ANOMALY_THRESHOLD_KWH} кВт·ч)`,
          details: {
            lastReadingDate: prev.readingDate,
            lastReadingValue: prev.value,
            currentReadingDate: curr.readingDate,
            currentReadingValue: curr.value,
            consumption,
          },
        });
      }
    }
  }

    return ok(request, { issues });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
