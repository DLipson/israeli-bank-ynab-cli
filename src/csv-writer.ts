import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
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
function generateFilename(prefix: string = "ynab-transactions"): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, "-")  // Windows-safe
    .replace(/\.\d{3}Z$/, "");  // Remove milliseconds
  return `${prefix}-${timestamp}.csv`;
}

/**
 * Write YNAB rows to CSV file
 */
export function writeCSV(
  rows: YnabRow[],
  outputDir: string,
  filename?: string
): string {
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputFilename = filename ?? generateFilename();
  const outputPath = join(outputDir, outputFilename);

  const csv = toCSV(rows);
  writeFileSync(outputPath, csv, "utf-8");

  return outputPath;
}

/**
 * Write separate CSV files per account
 */
export function writeCSVPerAccount(
  rowsByAccount: Map<string, YnabRow[]>,
  outputDir: string
): string[] {
  const paths: string[] = [];

  for (const [accountName, rows] of rowsByAccount) {
    if (rows.length === 0) continue;

    const safeName = accountName.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    const filename = generateFilename(`ynab-${safeName}`);
    const path = writeCSV(rows, outputDir, filename);
    paths.push(path);
  }

  return paths;
}
