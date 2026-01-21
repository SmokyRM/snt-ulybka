import { getSessionUser, hasAdminAccess } from "@/lib/session.server";
import { isOfficeRole, isAdminRole } from "@/lib/rbac";
import { listAllMeters, getLastMeterReading } from "@/lib/mockDb";
import { badRequest, forbidden, ok, serverError, unauthorized } from "@/lib/api/respond";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized(request);
  
  const role = user.role;
  if (!hasAdminAccess(user) && !isOfficeRole(role) && !isAdminRole(role)) {
    return forbidden(request);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return badRequest(request, "Файл не загружен");
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return badRequest(request, "CSV файл пуст или содержит только заголовок");
    }

    // Detect separator (; or ,)
    const firstLine = lines[0];
    const separator = firstLine.includes(";") ? ";" : ",";
    const header = firstLine.split(separator).map((h) => h.replace(/^"|"$/g, "").trim());
    const expectedHeaders = ["plotId", "street", "plotNumber", "meterNumber", "readingDate", "value"];
    const hasAllHeaders = expectedHeaders.every((h) => header.includes(h));
    if (!hasAllHeaders) {
      return badRequest(request, `Неверный формат CSV. Ожидаются колонки: ${expectedHeaders.join(", ")}`);
    }

    const plotIdIdx = header.indexOf("plotId");
    const readingDateIdx = header.indexOf("readingDate");
    const valueIdx = header.indexOf("value");
    const meterNumberIdx = header.indexOf("meterNumber");

    const allMeters = listAllMeters().filter((m) => m.active);
    const preview: Array<{
      row: number;
      plotId: string;
      meterNumber?: string;
      readingDate: string;
      value: number;
      previousValue?: number | null;
      consumption?: number | null;
      status: "valid" | "error";
      error?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = line.split(separator).map((v) => v.replace(/^"|"$/g, "").trim());
      
      if (values.length < header.length) continue;

      const plotId = values[plotIdIdx] || "";
      const meterNumber = values[meterNumberIdx] || "";
      const readingDate = values[readingDateIdx] || "";
      const valueStr = values[valueIdx] || "";

      if (!plotId || !readingDate || !valueStr) {
        preview.push({
          row: i + 1,
          plotId,
          meterNumber: meterNumber || undefined,
          readingDate,
          value: 0,
          status: "error",
          error: "Не заполнены обязательные поля",
        });
        continue;
      }

      const value = Number(valueStr.replace(",", "."));
      if (!Number.isFinite(value) || value < 0) {
        preview.push({
          row: i + 1,
          plotId,
          meterNumber: meterNumber || undefined,
          readingDate,
          value: 0,
          status: "error",
          error: "Некорректное значение показания",
        });
        continue;
      }

      // Find meter by plotId and optionally meterNumber
      const meter = allMeters.find(
        (m) => m.plotId === plotId && (!meterNumber || m.meterNumber === meterNumber)
      );

      if (!meter) {
        preview.push({
          row: i + 1,
          plotId,
          meterNumber: meterNumber || undefined,
          readingDate,
          value,
          status: "error",
          error: "Счётчик не найден",
        });
        continue;
      }

      const lastReading = getLastMeterReading(meter.id);
      if (lastReading && value < lastReading.value) {
        preview.push({
          row: i + 1,
          plotId,
          meterNumber: meter.meterNumber || undefined,
          readingDate,
          value,
          previousValue: lastReading.value,
          consumption: value - lastReading.value,
          status: "error",
          error: `Показание меньше предыдущего (${lastReading.value})`,
        });
        continue;
      }

      preview.push({
        row: i + 1,
        plotId,
        meterNumber: meter.meterNumber || undefined,
        readingDate,
        value,
        previousValue: lastReading?.value ?? null,
        consumption: lastReading ? value - lastReading.value : null,
        status: "valid",
      });
    }

    const validCount = preview.filter((p) => p.status === "valid").length;
    const errorCount = preview.filter((p) => p.status === "error").length;

    return ok(request, {
      preview,
      summary: {
        total: preview.length,
        valid: validCount,
        errors: errorCount,
      },
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
