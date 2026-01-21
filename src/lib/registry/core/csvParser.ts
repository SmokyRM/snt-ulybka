/**
 * CSV Parser for registry import
 * Supports two formats:
 * - v1: №, ФИО, Ул., Уч., Адрес, Тел.р
 * - v2: Улица_СНТ_номер, Участок_номер, ФИО, Телефон, Email, Городской_адрес, Примечание
 */

export interface CsvRegistryRow {
  rowIndex: number;
  number?: string; // № (v1) or Участок_номер (v2)
  fullName?: string; // ФИО
  street?: string; // Ул. (v1) or Улица_СНТ_номер (v2)
  plot?: string; // Уч. (v1)
  address?: string; // Адрес (v1) or Городской_адрес (v2)
  phone?: string; // Тел.р (v1) or Телефон (v2)
  email?: string; // Email (v2, optional)
  note?: string; // Примечание (v2, optional)
}

export interface ParsedRegistryPerson {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  plots: Array<{
    plotNumber: string;
    sntStreetNumber: string; // Номер улицы/линии в СНТ (нормализован)
    cityAddress?: string | null; // Городской адрес человека
  }>;
}

export interface ParseError {
  rowIndex: number;
  message: string;
}

export interface ParseResult {
  persons: Map<string, ParsedRegistryPerson>; // Key: normalized fullName+phone
  errors: ParseError[];
  rawRows?: Array<{
    rowIndex: number;
    fullName?: string;
    phone?: string | null;
    email?: string | null;
    sntStreetNumber?: string;
    plotNumber?: string;
    cityAddress?: string | null;
    note?: string | null;
    errors: string[];
  }>;
}

function parseCsv(text: string, delimiter: string = ";"): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let value = "";
  let inQuotes = false;

  const pushValue = () => {
    current.push(value.trim());
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
    } else if (ch === delimiter || ch === ",") {
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
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  // Remove "р." and "д." markers, normalize to digits only
  let normalized = phone.replace(/[рдРД]\./g, "").trim();
  normalized = normalized.replace(/\D/g, "");
  if (normalized.length === 0) return null;
  // If starts with 8, replace with +7
  if (normalized.startsWith("8") && normalized.length === 11) {
    normalized = "+7" + normalized.slice(1);
  } else if (!normalized.startsWith("+") && normalized.length === 10) {
    normalized = "+7" + normalized;
  } else if (!normalized.startsWith("+") && normalized.length === 11) {
    normalized = "+" + normalized;
  }
  return normalized;
}

function normalizeName(name: string | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Нормализует номер улицы/линии СНТ.
 * Принимает значения типа "1", "01", "Улица 1", "линия 2" и возвращает нормализованный номер (например "1", "2").
 */
function normalizeStreetNumber(street: string | undefined): string | null {
  if (!street) return null;
  const trimmed = street.trim();
  if (!trimmed) return null;
  
  // Извлекаем число из строки (может быть "1", "01", "Улица 1", "линия 2", "строка 3" и т.д.)
  const match = trimmed.match(/\d+/);
  if (match) {
    // Убираем ведущие нули (например "01" -> "1")
    const number = parseInt(match[0], 10).toString();
    return number;
  }
  
  // Если число не найдено, возвращаем null (будет ошибка валидации)
  return null;
}

function getPersonKey(fullName: string, phone: string | null): string {
  const normalizedName = fullName.toLowerCase().trim();
  const normalizedPhone = phone ? phone.replace(/\D/g, "") : "";
  return `${normalizedName}|${normalizedPhone}`;
}

export function parseRegistryCsv(text: string, returnRawRows: boolean = false): ParseResult {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { persons: new Map(), errors: [{ rowIndex: 0, message: "CSV должен содержать заголовок и хотя бы одну строку данных" }] };
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);

  // Detect format: v2 has "Улица_СНТ_номер" or "Участок_номер"
  const isV2Format =
    headerRow.some((h) => h.toLowerCase().includes("улица_снт")) ||
    headerRow.some((h) => h.toLowerCase().includes("участок_номер"));

  // Find column indices (flexible matching)
  const findColumn = (patterns: string[]): number => {
    for (let i = 0; i < headerRow.length; i++) {
      const header = headerRow[i].toLowerCase().trim();
      if (patterns.some((p) => header.includes(p.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  };

  // v2 format mapping
  const streetIdx = isV2Format
    ? findColumn(["улица_снт", "улица_снт_номер"])
    : findColumn(["ул", "улица", "street"]);
  const plotIdx = isV2Format
    ? findColumn(["участок_номер"])
    : findColumn(["уч", "участок", "plot"]);
  const numberIdx = isV2Format ? -1 : findColumn(["№", "номер", "number", "уч"]);
  const fullNameIdx = findColumn(["фио", "ф.и.о", "fullname", "name", "владелец"]);
  const addressIdx = isV2Format
    ? findColumn(["городской_адрес", "адрес"])
    : findColumn(["адрес", "address"]);
  const phoneIdx = isV2Format
    ? findColumn(["телефон"])
    : findColumn(["тел", "телефон", "phone", "тел.р"]);
  const emailIdx = isV2Format ? findColumn(["email"]) : -1;
  const noteIdx = isV2Format ? findColumn(["примечание"]) : -1;

  const errors: ParseError[] = [];
  const persons = new Map<string, ParsedRegistryPerson>();
  const rawRows = returnRawRows
    ? [] as Array<{
        rowIndex: number;
        fullName?: string;
        phone?: string | null;
        email?: string | null;
        sntStreetNumber?: string;
        plotNumber?: string;
        cityAddress?: string | null;
        note?: string | null;
        errors: string[];
      }>
    : undefined;

  dataRows.forEach((row, rowIndex) => {
    const actualRowIndex = rowIndex + 2; // +1 for header, +1 for 1-based indexing

    // Extract values based on format
    const number = numberIdx >= 0 ? row[numberIdx]?.trim() : undefined;
    const fullName = fullNameIdx >= 0 ? row[fullNameIdx]?.trim() : undefined;
    const streetRaw = streetIdx >= 0 ? row[streetIdx]?.trim() : undefined;
    // v2: plotIdx contains "Участок_номер", v1: plotIdx is "Уч.", fallback to numberIdx
    const plot = plotIdx >= 0 ? row[plotIdx]?.trim() : number;
    const address = addressIdx >= 0 ? row[addressIdx]?.trim() : undefined;
    const phone = phoneIdx >= 0 ? row[phoneIdx]?.trim() : undefined;
    const email = emailIdx >= 0 ? row[emailIdx]?.trim() || null : null;
    const note = noteIdx >= 0 ? row[noteIdx]?.trim() || null : null;

    // Normalize street number
    const sntStreetNumber = normalizeStreetNumber(streetRaw);
    const plotNumber = (number || plot || "").trim();

    // Validate row and collect errors
    const rowErrors: string[] = [];
    if (!fullName || fullName.length === 0) {
      rowErrors.push("Отсутствует ФИО");
    }
    if (!sntStreetNumber) {
      rowErrors.push("Отсутствует номер улицы");
    }
    if (!plotNumber) {
      rowErrors.push("Отсутствует номер участка");
    }

    // Early return if returnRawRows and we have errors - don't process further
    if (returnRawRows && rowErrors.length > 0 && rawRows) {
      rawRows.push({
        rowIndex: actualRowIndex,
        fullName: fullName?.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        sntStreetNumber: sntStreetNumber || undefined,
        plotNumber: plotNumber || undefined,
        cityAddress: address?.trim() || null,
        note: note?.trim() || null,
        errors: rowErrors,
      });
      rowErrors.forEach((msg) => {
        errors.push({ rowIndex: actualRowIndex, message: msg });
      });
      return;
    }

    // If returnRawRows and no errors, add row for processing
    if (returnRawRows && rawRows && rowErrors.length === 0) {
      rawRows.push({
        rowIndex: actualRowIndex,
        fullName: fullName?.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        sntStreetNumber: sntStreetNumber || undefined,
        plotNumber: plotNumber || undefined,
        cityAddress: address?.trim() || null,
        note: note?.trim() || null,
        errors: [],
      });
    }

    // If errors and not returnRawRows, add to global errors and skip aggregation
    if (rowErrors.length > 0 && !returnRawRows) {
      rowErrors.forEach((msg) => {
        errors.push({ rowIndex: actualRowIndex, message: msg });
      });
      // Old behavior: skip aggregation on error
      return;
    }

    // If errors exist and we're using returnRawRows, we already returned above
    if (rowErrors.length > 0) {
      return;
    }

    // At this point, we know sntStreetNumber and plotNumber are valid (non-null, non-empty)
    // TypeScript doesn't understand this, so we assert with non-null assertion
    const validSntStreetNumber: string = sntStreetNumber!;
    const validPlotNumber: string = plotNumber;

    const normalizedFullName = normalizeName(fullName);
    const normalizedPhone = normalizePhone(phone);

    const personKey = getPersonKey(normalizedFullName, normalizedPhone);
    let person = persons.get(personKey);

    if (!person) {
      person = {
        fullName: normalizedFullName,
        phone: normalizedPhone,
        email: email?.trim() || null,
        plots: [],
      };
      persons.set(personKey, person);
    } else if (email?.trim()) {
      // Update email if person exists but doesn't have email yet
      const trimmedEmail = email.trim();
      if (trimmedEmail && !person.email) {
        person.email = trimmedEmail;
      }
    }

    // Add plot to person (sntStreetNumber and plotNumber are validated above)
    person.plots.push({
      plotNumber: validPlotNumber,
      sntStreetNumber: validSntStreetNumber,
      cityAddress: address?.trim() || null,
    });
  });

  return { persons, errors, rawRows };
}
