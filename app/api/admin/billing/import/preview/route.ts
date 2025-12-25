import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session.server";
import { formatAdminTime } from "@/lib/settings";
import { getPlots, listPayments } from "@/lib/mockDb";

const MAX_ROWS = 200;

const headerMap: Record<string, string> = {
  "дата": "date",
  "date": "date",
  "сумма": "amount",
  "amount": "amount",
  "назначение": "purpose",
  "purpose": "purpose",
  "comment": "purpose",
  "улица": "street",
  "street": "street",
  "участок": "plot",
  "plot": "plot",
  "number": "plot",
  "номер операции": "reference",
  "reference": "reference",
};

const normalizeHeader = (h: string) => h.trim().toLowerCase();

const parseCsv = (content: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(current);
    current = "";
  };

  const pushRow = () => {
    if (row.length > 0 || current) {
      pushCell();
      rows.push(row);
      row = [];
    }
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ";") {
        pushCell();
      } else if (ch === "\n") {
        pushRow();
      } else if (ch === "\r") {
        if (next === "\n") {
          // skip, will be handled on \n
        } else {
          pushRow();
        }
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length) {
    pushCell();
    rows.push(row);
  }
  return rows;
};

const parseDate = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  // DD.MM.YYYY or DD.MM.YYYY HH:mm[:ss]
  const dm = value.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (dm) {
    const [, d, m, y, hh = "00", mm = "00", ss = "00"] = dm;
    const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) return asDate.toISOString();
  return null;
};

const parseAmount = (raw?: string | null): number | null => {
  if (!raw) return null;
  const cleaned = raw.replace(/\s/g, "").replace(",", ".").trim();
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
};

const normalizeStreet = (value?: string | null) =>
  (value ?? "").trim().toLowerCase().replace(/ё/g, "е");

const normalizePlotNumber = (value?: string | null) => (value ?? "").trim();

const matchPlot = (
  streetRaw: string | undefined,
  plotRaw: string | undefined,
  purpose: string | undefined,
  plots: ReturnType<typeof getPlots>
) => {
  const streetNorm = normalizeStreet(streetRaw);
  const plotNumNorm = normalizePlotNumber(plotRaw);
  let matched =
    streetNorm && plotNumNorm
      ? plots.find(
          (p) => normalizeStreet(p.street) === streetNorm && normalizePlotNumber(p.plotNumber) === plotNumNorm
        )
      : undefined;

  const purposeText = (purpose ?? "").toLowerCase().replace(/ё/g, "е");
  if (!matched) {
    const numMatch = purposeText.match(/уч(?:асток|\.?)\s*№?\s*(\d+)/i);
    const numParsed = numMatch ? numMatch[1] : null;
    if (numParsed) {
      const streetNames = plots.map((p) => p.street).filter(Boolean);
      const streetFound = streetNames.find((s) => purposeText.includes(normalizeStreet(s)));
      const sNorm = normalizeStreet(streetFound);
      matched = plots.find(
        (p) =>
          normalizePlotNumber(p.plotNumber) === numParsed &&
          (!streetFound || normalizeStreet(p.street) === sNorm)
      );
      return {
        streetParsed: streetFound ?? null,
        plotNumberParsed: numParsed,
        matchedPlotId: matched?.id ?? null,
      };
    }
  }

  return {
    streetParsed: streetNorm || null,
    plotNumberParsed: plotNumNorm || null,
    matchedPlotId: matched?.id ?? null,
  };
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const textRaw = await file.text();
  const content = textRaw.replace(/^\uFEFF/, ""); // remove BOM if any
  const rowsRaw = parseCsv(content);
  if (!rowsRaw.length) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }

  const headerRow = rowsRaw[0].map(normalizeHeader);
  const rows = rowsRaw.slice(1, MAX_ROWS + 1);
  const plots = getPlots();
  const payments = listPayments({});

  const col = (keys: string[]) => {
    for (let i = 0; i < headerRow.length; i++) {
      const normalized = headerMap[headerRow[i]] ?? headerRow[i];
      if (keys.includes(normalized)) return i;
    }
    return -1;
  };

  const idxDate = col(["date"]);
  const idxAmount = col(["amount"]);
  const idxPurpose = col(["purpose"]);
  const idxStreet = col(["street"]);
  const idxPlot = col(["plot"]);
  const idxRef = col(["reference"]);

  const result = rows.map((cells, index) => {
    const rowIndex = index + 2; // considering header row as 1
    const dateVal = idxDate >= 0 ? cells[idxDate] : "";
    const amountVal = idxAmount >= 0 ? cells[idxAmount] : "";
    const purposeVal = idxPurpose >= 0 ? cells[idxPurpose] : "";
    const streetVal = idxStreet >= 0 ? cells[idxStreet] : "";
    const plotVal = idxPlot >= 0 ? cells[idxPlot] : "";
    const refVal = idxRef >= 0 ? cells[idxRef] : "";

    const paidAtIso = parseDate(dateVal);
    const amount = parseAmount(amountVal);
    const match = matchPlot(streetVal, plotVal, purposeVal, plots);

    let status: "OK" | "ERROR" | "DUPLICATE" = "OK";
    let error: string | undefined;

    if (!paidAtIso) {
      status = "ERROR";
      error = "Некорректная дата";
    } else if (!amount || amount <= 0) {
      status = "ERROR";
      error = "Некорректная сумма";
    } else if (!match.matchedPlotId) {
      status = "ERROR";
      error = "Участок не найден";
    }

    let duplicate = false;
    if (status === "OK") {
      if (refVal) {
        const hasRef = payments.some((p) => !p.isVoided && p.reference === refVal);
        if (hasRef) duplicate = true;
      } else if (match.matchedPlotId && paidAtIso) {
        const paidDay = paidAtIso.split("T")[0];
        const hasSimilar = payments.some(
          (p) =>
            !p.isVoided &&
            p.plotId === match.matchedPlotId &&
            p.method === "bank" &&
            Math.abs(p.amount - (amount ?? 0)) < 1e-9 &&
            (p.paidAt ?? "").startsWith(paidDay)
        );
        if (hasSimilar) duplicate = true;
      }
    }

    if (duplicate) {
      status = "DUPLICATE";
    }

    return {
      rowIndex,
      paidAtIso,
      paidAtLocalFormatted: paidAtIso ? formatAdminTime(paidAtIso) : null,
      amount,
      purpose: purposeVal,
      streetRaw: streetVal,
      plotNumberRaw: plotVal,
      streetParsed: match.streetParsed,
      plotNumberParsed: match.plotNumberParsed,
      plotIdMatched: match.matchedPlotId,
      reference: refVal || null,
      status,
      error,
    };
  });

  const okCount = result.filter((r) => r.status === "OK").length;
  const errorCount = result.filter((r) => r.status === "ERROR").length;
  const duplicateCount = result.filter((r) => r.status === "DUPLICATE").length;

  return NextResponse.json({
    ok: true,
    meta: {
      totalRows: rows.length,
      okCount,
      errorCount,
      duplicateCount,
      truncated: rowsRaw.length - 1 > MAX_ROWS,
    },
    rows: result,
  });
}
