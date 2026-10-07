/**
 * Pure RFC 4180 CSV generator and client-side downloader.
 * Ensures compatibility with spreadsheet software (Microsoft Excel, Google Sheets, etc.).
 */

/**
 * Escapes a cell value according to RFC 4180.
 * If the value contains commas, double quotes, or newlines, it is enclosed
 * in quotes and any internal double quotes are escaped as `""`.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface GenerateCsvOptions {
  /** If true, prefixes the output with a UTF-8 Byte Order Mark (\uFEFF) */
  withBom?: boolean;
}

/**
 * Formats headers and row data into a compliant RFC 4180 CSV string.
 */
export function generateCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | boolean | null | undefined)[])[],
  options?: GenerateCsvOptions,
): string {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  const csv = [headerLine, ...dataLines].join("\r\n");
  return options?.withBom ? `\uFEFF${csv}` : csv;
}

/**
 * Triggers a browser file download of CSV content with a UTF-8 BOM prefix (\uFEFF)
 * so Microsoft Excel on Windows renders UTF-8 characters correctly.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === "undefined") return;
  const content = csvContent.startsWith("\uFEFF") ? csvContent : `\uFEFF${csvContent}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
