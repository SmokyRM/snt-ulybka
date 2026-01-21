/**
 * Excel adapter using exceljs
 * Provides compatible API with xlsx for reading and writing Excel files
 * Migration from xlsx to exceljs (xlsx has 2 HIGH vulnerabilities with no fix)
 */

import ExcelJS from "exceljs";
import { Buffer } from "buffer";

/**
 * Parse Excel file from buffer and return array of arrays (rows)
 * Compatible with XLSX.read + XLSX.utils.sheet_to_json(sheet, { header: 1 })
 *
 * @param buffer - File buffer (Uint8Array or ArrayBuffer)
 * @returns Array of arrays representing rows
 */
export async function parseXlsx(buffer: Uint8Array | ArrayBuffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();

  // Convert to Node.js Buffer (exceljs requires Buffer type)
  let nodeBuffer: Buffer;
  if (buffer instanceof Uint8Array) {
    nodeBuffer = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  } else {
    nodeBuffer = Buffer.from(buffer);
  }

  // @ts-expect-error - DOM/Node.js Buffer type conflict
  await workbook.xlsx.load(nodeBuffer);

  // Get first worksheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const rows: string[][] = [];

  // Iterate through rows and convert to array of arrays
  worksheet.eachRow((row, rowNumber) => {
    const rowData: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Convert cell value to string
      const value = cell.value;
      if (value === null || value === undefined) {
        rowData.push("");
      } else if (typeof value === "object" && "text" in value) {
        // Rich text
        rowData.push(value.text as string);
      } else if (value instanceof Date) {
        rowData.push(value.toISOString());
      } else {
        rowData.push(String(value));
      }
    });
    rows.push(rowData);
  });

  return rows;
}

/**
 * Build Excel workbook from array of arrays and return as Buffer
 * Compatible with XLSX.utils.aoa_to_sheet + XLSX.utils.book_new + XLSX.writeFile
 *
 * @param data - Array of arrays representing rows
 * @param sheetName - Name of the worksheet (default: "Sheet1")
 * @returns Buffer containing Excel file
 */
export async function buildXlsxFromArray(data: (string | number | null)[][], sheetName = "Sheet1"): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add rows
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : "";
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(50, Math.max(10, maxLength + 2));
  });

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Build Excel workbook from array of JSON objects and return as Buffer
 * Compatible with XLSX.utils.json_to_sheet + XLSX.utils.book_new + XLSX.writeFile
 *
 * @param data - Array of objects
 * @param sheetName - Name of the worksheet (default: "Sheet1")
 * @returns Buffer containing Excel file
 */
export async function buildXlsxFromJson(data: Record<string, unknown>[], sheetName = "Sheet1"): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);

  // Add header row
  worksheet.addRow(headers);

  // Add data rows
  data.forEach((item) => {
    const row = headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return "";
      if (value instanceof Date) return value;
      if (typeof value === "number") return value;
      return String(value);
    });
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index]?.length || 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : "";
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(50, Math.max(10, maxLength + 2));
  });

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Download Excel file in browser
 * Compatible with XLSX.writeFile
 *
 * @param buffer - Excel file buffer
 * @param filename - Filename to download
 */
export function downloadXlsx(buffer: Buffer, filename: string): void {
  // @ts-expect-error - DOM/Node.js Buffer type conflict
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
