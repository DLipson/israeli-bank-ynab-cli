import type { YnabRow } from "./transformer.js";

const CSV_HEADERS = ["Date", "Payee", "Memo", "Outflow", "Inflow"];

/**
 * Escape a value for CSV (handle quotes and commas)
 */
function escapeCSV(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert YNAB rows to CSV string
 */
export function toCSV(rows: YnabRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(",")];

  for (const row of rows) {
    const values = [
      escapeCSV(row.date),
      escapeCSV(row.payee),
      escapeCSV(row.memo),
      escapeCSV(row.outflow),
      escapeCSV(row.inflow),
    ];
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

/**
 * Generate output filename with timestamp
 */
export function generateFilename(prefix: string = "ynab-transactions"): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, "-")  // Windows-safe
    .replace(/\.\d{3}Z$/, "");  // Remove milliseconds
  return `${prefix}-${timestamp}.csv`;
}
