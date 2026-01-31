import { ok, badRequest, serverError } from "@/lib/api/respond";
import { requirePermission } from "@/lib/permissionsGuard";
import {
  getPlotByNumber,
  listPlots,
  listUnifiedBillingPeriods,
  listPayments,
} from "@/lib/mockDb";
import crypto from "crypto";

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;
  const pushValue = () => {
    current.push(value.trim());
    value = "";
  };
  const pushRow = () => {
    if (current.length || value) {
      if (value) pushValue();
      if (current.length) rows.push(current);
      current = [];
    }
  };
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        value += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else value += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ";" || ch === ",") pushValue();
      else if (ch === "\n") pushRow();
      else if (ch === "\r") {
        if (next !== "\n") pushRow();
      } else value += ch;
    }
  }
  pushRow();
  return rows;
}

function parseDate(raw: string | null | undefined): string | null {
  if (!raw || !String(raw).trim()) return null;
  const t = String(raw).trim();
  const m1 = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m1) return m1[0];
  const m2 = t.match(/^(\d{2})[.\/](\d{2})[.\/](\d{4})$/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  const d = new Date(t);
  return !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

function col(header: string[], keys: string[][]): number {
  const lower = (s: string) => String(s ?? "").trim().toLowerCase();
  for (let i = 0; i < header.length; i++) {
    const h = lower(header[i]);
    if (keys.some((kk) => kk.some((k) => h.includes(lower(k))))) return i;
  }
  return -1;
}

function fingerprint(date: string, amount: number, plotId: string, phone: string, comment: string): string {
  const s = [date, String(amount), plotId || "", (phone || "").trim(), (comment || "").trim()].join("|");
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);
}

const norm = (v: string) => String(v ?? "").replace(/\D/g, "");

/** Preview: парсит CSV, валидация, match, potential duplicates. Не пишет в БД. Admin + office. */
export async function POST(request: Request) {
  try {
    const guard = await requirePermission(request, "billing.import", {
      route: "/api/admin/billing/payments/import/preview",
      deniedReason: "billing.import",
    });
    if (guard instanceof Response) return guard;

  let content: string;
  let fileName = "import.csv";

  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || !(file instanceof Blob)) {
      return badRequest(request, "file is required");
    }
    try {
      content = (await file.text()).replace(/^\uFEFF/, "");
      if (file instanceof File) fileName = file.name;
    } catch {
      return badRequest(request, "Не удалось прочитать файл");
    }
  } else {
    const body = await request.json().catch(() => ({}));
    const csv = body.csv;
    if (typeof csv !== "string") return badRequest(request, "csv (string) or multipart file required");
    content = body.base64 ? Buffer.from(csv, "base64").toString("utf-8") : csv;
    content = content.replace(/^\uFEFF/, "");
  }

    const raw = parseCsv(content);
    if (raw.length < 2) {
      return badRequest(request, "Нужна строка заголовков и хотя бы одна строка данных");
    }

  const header = raw[0].map((h) => String(h ?? "").trim());
  const idxDate = col(header, [["date"], ["дата"], ["paid_at"]]);
  const idxAmount = col(header, [["amount"], ["сумма"], ["sum"]]);
  const idxPlot = col(header, [["plotnumber"], ["plot_no"], ["plotno"], ["plot"], ["plot_number"], ["участок"], ["номер"]]);
  const idxOwner = col(header, [["ownername"], ["owner"], ["payername"], ["payer"], ["name"], ["fio"], ["плательщик"]]);
  const idxPhone = col(header, [["phone"], ["телефон"], ["tel"]]);
  const idxComment = col(header, [["comment"], ["комментарий"], ["purpose"], ["назначение"]]);

    if (idxDate === -1 || idxAmount === -1) {
      return badRequest(request, "Обязательные колонки: date, amount. Найдены: " + header.join(", "));
    }

  const plots = listPlots();
  const periods = listUnifiedBillingPeriods();
  const existingPayments = listPayments({});
  const existingFps = new Set(existingPayments.map((p) => p.fingerprint).filter(Boolean));

  const previewRows: Array<{
    rowNumber: number;
    rawLine: string;
    date: string;
    amount: number;
    plotNumber: string | null;
    ownerName: string | null;
    phone: string | null;
    comment: string | null;
    status: "ok" | "warning" | "error";
    errorMessage: string | null;
    matchedPlotId: string | null;
    matchType: "plot_number" | "phone" | "owner_name" | null;
    periodId: string | null;
    potentialDuplicate: boolean;
  }> = [];

  const seenFpInBatch = new Set<string>();
  let okCount = 0,
    warning = 0,
    err = 0;

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] ?? [];
    const rowNumber = i + 1;
    const rawLine = row.join(row.some((c) => c.includes(",")) ? ";" : ",");

    const emptyRow = row.every((c) => !String(c ?? "").trim());
    if (emptyRow) {
      previewRows.push({
        rowNumber,
        rawLine,
        date: "",
        amount: 0,
        plotNumber: null,
        ownerName: null,
        phone: null,
        comment: null,
        status: "error",
        errorMessage: "Пустая строка",
        matchedPlotId: null,
        matchType: null,
        periodId: null,
        potentialDuplicate: false,
      });
      err++;
      continue;
    }

    const dateRaw = idxDate >= 0 ? String(row[idxDate] ?? "").trim() || null : null;
    const amountRaw = idxAmount >= 0 ? String(row[idxAmount] ?? "").trim() || null : null;
    const plotNumber = idxPlot >= 0 ? String(row[idxPlot] ?? "").trim() || null : null;
    const ownerName = idxOwner >= 0 ? String(row[idxOwner] ?? "").trim() || null : null;
    const phone = idxPhone >= 0 ? String(row[idxPhone] ?? "").trim() || null : null;
    const comment = idxComment >= 0 ? String(row[idxComment] ?? "").trim() || null : null;

    const errors: string[] = [];

    if (!dateRaw) errors.push("Нет даты");
    const dateVal = dateRaw ? parseDate(dateRaw) : "";
    if (dateRaw && !dateVal) errors.push("Неверная дата");

    if (!amountRaw) errors.push("Нет суммы");
    const num = amountRaw ? Number(String(amountRaw).replace(",", ".").replace(/\s/g, "")) : 0;
    if (amountRaw && (!Number.isFinite(num) || num <= 0)) errors.push("Сумма должна быть > 0");
    const amountVal = Number.isFinite(num) && num > 0 ? num : 0;

    let matchedPlotId: string | null = null;
    let matchType: "plot_number" | "phone" | "owner_name" | null = null;
    let status: "ok" | "warning" | "error" = errors.length > 0 ? "error" : "ok";

    if (errors.length === 0) {
      if (plotNumber) {
        const p = getPlotByNumber(plotNumber);
        if (p) {
          matchedPlotId = p.id;
          matchType = "plot_number";
        }
      }
      if (!matchedPlotId && phone && norm(phone)) {
        const p = plots.find((x) => (x.phone && norm(x.phone)) === norm(phone));
        if (p) {
          matchedPlotId = p.id;
          matchType = "phone";
          status = "warning";
        }
      }
      if (!matchedPlotId && ownerName) {
        const low = ownerName.toLowerCase();
        const p = plots.find((x) => x.ownerFullName && String(x.ownerFullName).toLowerCase().includes(low));
        if (p) {
          matchedPlotId = p.id;
          matchType = "owner_name";
          status = "warning";
        }
      }
    }

    let periodId: string | null = null;
    if (dateVal && periods.length) {
      const p = periods.find((x) => dateVal >= x.from && dateVal <= x.to);
      periodId = p?.id ?? null;
    }

    let potentialDuplicate = false;
    if (matchedPlotId && errors.length === 0) {
      const fp = fingerprint(dateVal ?? "", amountVal, matchedPlotId, phone ?? "", comment ?? "");
      potentialDuplicate = seenFpInBatch.has(fp) || existingFps.has(fp);
      seenFpInBatch.add(fp);
    }

    if (errors.length) err++;
    else if (status === "warning") warning++;
    else okCount++;

    previewRows.push({
      rowNumber,
      rawLine,
      date: dateVal ?? "",
      amount: amountVal,
      plotNumber,
      ownerName,
      phone,
      comment,
      status,
      errorMessage: errors.length ? errors.join("; ") : null,
      matchedPlotId,
      matchType,
      periodId,
      potentialDuplicate,
    });
  }

    return ok(request, {
      previewRows,
      stats: { ok: okCount, warning, error: err },
      fileName,
    });
  } catch (error) {
    return serverError(request, "Internal error", error);
  }
}
