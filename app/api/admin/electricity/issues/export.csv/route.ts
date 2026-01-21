import { NextResponse } from "next/server";
import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listAllMeters, listMeterReadings, findPlotById } from "@/lib/mockDb";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api/respond";

type IssueType = "missing_readings" | "no_previous" | "negative_consumption" | "anomaly_spike";

interface ElectricityIssue {
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

const ANOMALY_THRESHOLD_KWH = 5000;

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  const url = new URL(request.url);
  const issueType = url.searchParams.get("type");
  const year = url.searchParams.get("year");
  const month = url.searchParams.get("month");

  const yearNum = year ? Number(year) : new Date().getFullYear();
  const monthNum = month ? Number(month) : new Date().getMonth() + 1;

  if (!Number.isInteger(yearNum) || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return badRequest(request, "Неверный период");
  }

  try {
    const periodStart = new Date(yearNum, monthNum - 1, 1);
    const periodEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

    const allMeters = listAllMeters().filter((m) => m.active);
    const issues: ElectricityIssue[] = [];

    for (const meter of allMeters) {
      const plot = findPlotById(meter.plotId);
      const readings = listMeterReadings(meter.id).sort((a, b) => 
        new Date(a.readingDate).getTime() - new Date(b.readingDate).getTime()
      );

      // 1. Пропуски показаний
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
            period: `${yearNum}-${monthNum.toString().padStart(2, "0")}`,
          },
        });
      }

      // 2. Нет предыдущих показаний
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

    const toCsvValue = (value: string | number | null | undefined) => {
      if (value === null || value === undefined) return '""';
      const str = typeof value === "number" ? value.toString() : value;
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const getIssueTypeLabel = (type: IssueType) => {
      switch (type) {
        case "missing_readings":
          return "Пропуски показаний";
        case "no_previous":
          return "Нет предыдущих показаний";
        case "negative_consumption":
          return "Отрицательное потребление";
        case "anomaly_spike":
          return "Аномальный скачок";
        default:
          return type;
      }
    };

    const header = [
      "Тип проблемы",
      "Улица",
      "Участок",
      "Владелец",
      "№ счётчика",
      "Описание",
      "Дата предыдущего",
      "Предыдущее значение",
      "Дата текущего",
      "Текущее значение",
      "Потребление",
    ];

    const rows = issues.map((issue) =>
      [
        toCsvValue(getIssueTypeLabel(issue.type)),
        toCsvValue(issue.street || ""),
        toCsvValue(issue.plotNumber || ""),
        toCsvValue(issue.ownerFullName || ""),
        toCsvValue(issue.meterNumber || ""),
        toCsvValue(issue.description),
        toCsvValue(issue.details?.lastReadingDate || ""),
        toCsvValue(issue.details?.lastReadingValue ?? ""),
        toCsvValue(issue.details?.currentReadingDate || ""),
        toCsvValue(issue.details?.currentReadingValue ?? ""),
        toCsvValue(issue.details?.consumption ?? ""),
      ].join(";")
    );

    const content = ["\uFEFF" + header.map(toCsvValue).join(";"), ...rows].join("\r\n");
    const filename = `electricity_issues_${year || "all"}-${month?.padStart(2, "0") || "all"}.csv`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
