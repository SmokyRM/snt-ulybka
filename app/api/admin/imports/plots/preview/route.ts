import { getSessionUser, hasImportAccess } from "@/lib/session.server";
import { fail, forbidden, ok, serverError } from "@/lib/api/respond";

type PreviewRow = {
  rowIndex: number;
  cadastral?: string;
  plotNumber?: string;
  street?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  membershipStatus: "member" | "not_member" | "unknown";
  confirmed: boolean;
};

type PreviewError = { rowIndex: number; messages: string[] };

const headerAliases: Record<keyof Omit<PreviewRow, "rowIndex" | "confirmed" | "membershipStatus">, string[]> = {
  cadastral: ["cadastral", "cadastral_number", "кадастровый номер"],
  plotNumber: ["plotnumber", "plot_number", "plot", "участок", "номер участка"],
  street: ["street", "улица"],
  ownerName: ["ownername", "owner_name", "фио", "собственник"],
  phone: ["phone", "телефон"],
  email: ["email", "почта"],
};

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[."']/g, "")
    .trim();

const detectDelimiter = (line: string) => {
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    if (inQuotes) continue;
    if (ch === ",") commas += 1;
    if (ch === ";") semicolons += 1;
  }
  return semicolons >= commas ? ";" : ",";
};

const parseCsv = (text: string, delimiter: string) => {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const pushValue = () => {
    current.push(value);
    value = "";
  };
  const pushRow = () => {
    if (current.some((cell) => cell.trim() !== "")) {
      rows.push(current);
    }
    current = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      pushValue();
    } else if (ch === "\n") {
      pushValue();
      pushRow();
    } else if (ch === "\r") {
      continue;
    } else {
      value += ch;
    }
  }
  pushValue();
  pushRow();

  return rows;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, "");
const validatePhone = (value: string) => {
  if (!value) return null;
  const digits = normalizeDigits(value);
  if (digits.length !== 11 || (digits[0] !== "7" && digits[0] !== "8")) {
    return "Телефон должен содержать 11 цифр и начинаться с 7 или 8";
  }
  return null;
};
const validateEmail = (value: string) => {
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "Некорректный email";
  return null;
};

const parseMembershipStatus = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (!normalized) return "unknown";
  if (normalized === "member" || normalized === "член") return "member";
  if (normalized === "not_member" || normalized === "non_member" || normalized === "не_член") {
    return "not_member";
  }
  if (normalized === "unknown" || normalized === "неизвестно") return "unknown";
  return null;
};

const parseConfirmed = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (["true", "1", "да", "yes"].includes(normalized)) return true;
  if (["false", "0", "нет", "no"].includes(normalized)) return false;
  return null;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!hasImportAccess(user)) {
    return forbidden(request);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail(request, "validation_error", "file_required", 400);
    }

    const rawText = (await file.text()).replace(/^\uFEFF/, "");
    const firstLine = rawText.split(/\r?\n/)[0] ?? "";
    const delimiter = detectDelimiter(firstLine);
    const rows = parseCsv(rawText, delimiter);

    if (!rows.length) {
      return ok(request, {
        summary: { total: 0, valid: 0, invalid: 0 },
        previewRows: [],
        errors: [],
      });
    }

  const [headerRow, ...dataRows] = rows;
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const findIndex = (aliases: string[]) =>
    normalizedHeaders.findIndex((header) => aliases.includes(header));

  const headerIndex = {
    cadastral: findIndex(headerAliases.cadastral),
    plotNumber: findIndex(headerAliases.plotNumber),
    street: findIndex(headerAliases.street),
    ownerName: findIndex(headerAliases.ownerName),
    phone: findIndex(headerAliases.phone),
    email: findIndex(headerAliases.email),
    membershipStatus: findIndex(["membershipstatus", "membership_status", "статус членства"]),
    confirmed: findIndex(["confirmed", "подтвержден", "подтверждён"]),
  };

  const previewRows: PreviewRow[] = [];
  const errors: PreviewError[] = [];

  dataRows.forEach((cols, index) => {
    const rowIndex = index + 2;
    const getValue = (idx: number) => (idx >= 0 ? (cols[idx] ?? "").toString().trim() : "");
    const rowErrors: string[] = [];
    const cadastral = getValue(headerIndex.cadastral);
    const plotNumber = getValue(headerIndex.plotNumber);
    const street = getValue(headerIndex.street);
    const ownerName = getValue(headerIndex.ownerName);
    const phone = getValue(headerIndex.phone);
    const email = getValue(headerIndex.email);
    const membershipRaw = getValue(headerIndex.membershipStatus);
    const confirmedRaw = getValue(headerIndex.confirmed);

    if (!cadastral && !plotNumber) {
      rowErrors.push("Нужен кадастровый номер или номер участка");
    }

    const phoneError = validatePhone(phone);
    if (phoneError) rowErrors.push(phoneError);

    const emailError = validateEmail(email);
    if (emailError) rowErrors.push(emailError);

    const membershipStatus = parseMembershipStatus(membershipRaw);
    if (!membershipStatus) rowErrors.push("Статус членства должен быть member/not_member/unknown");

    const confirmed = parseConfirmed(confirmedRaw);
    if (confirmed === null) rowErrors.push("Подтверждение должно быть true/false/да/нет");

    const normalizedRow: PreviewRow = {
      rowIndex,
      cadastral: cadastral || undefined,
      plotNumber: plotNumber || undefined,
      street: street || undefined,
      ownerName: ownerName || undefined,
      phone: phone || undefined,
      email: email || undefined,
      membershipStatus: membershipStatus ?? "unknown",
      confirmed: confirmed ?? false,
    };

    previewRows.push(normalizedRow);
    if (rowErrors.length) {
      errors.push({ rowIndex, messages: rowErrors });
    }
  });

  const invalid = errors.length;
  const total = previewRows.length;
  const valid = total - invalid;

    return ok(request, {
      summary: { total, valid, invalid },
      previewRows: previewRows.slice(0, 50),
      errors,
    });
  } catch (e) {
    return serverError(request, "Internal error", e);
  }
}
