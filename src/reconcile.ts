import { readFileSync } from "node:fs";
import {
  normalizeRow,
  getEffectiveDate,
  getEffectiveAmount,
  type NormalizedTransaction,
} from "./column-standardization.js";

export interface ReconcileResult {
  sourceFile: string;
  targetFile: string;
  sourceCount: number;
  targetCount: number;
  matched: MatchedTransaction[];
  flagged: FlaggedTransaction[];
  missingFromTarget: NormalizedTransaction[];
  extraInTarget: NormalizedTransaction[];
}

export interface MatchedTransaction {
  source: NormalizedTransaction;
  target: NormalizedTransaction;
}

export interface FlaggedTransaction {
  source: NormalizedTransaction;
  target: NormalizedTransaction;
  dateDiff: number;
}

const DATE_TOLERANCE_DAYS = 2;

export function reconcile(
  sourceFile: string,
  targetFile: string
): ReconcileResult {
  const sourceTransactions = parseCSVFile(sourceFile);
  const targetTransactions = parseCSVFile(targetFile);

  const targetPool = [...targetTransactions];
  const matched: MatchedTransaction[] = [];
  const flagged: FlaggedTransaction[] = [];
  const missingFromTarget: NormalizedTransaction[] = [];

  for (const sourceTxn of sourceTransactions) {
    const match = findBestMatch(sourceTxn, targetPool);

    if (!match) {
      missingFromTarget.push(sourceTxn);
      continue;
    }

    removeFromPool(targetPool, match.target);

    if (match.dateDiff === 0) {
      matched.push({ source: sourceTxn, target: match.target });
    } else {
      flagged.push({ source: sourceTxn, target: match.target, dateDiff: match.dateDiff });
    }
  }

  return {
    sourceFile,
    targetFile,
    sourceCount: sourceTransactions.length,
    targetCount: targetTransactions.length,
    matched,
    flagged,
    missingFromTarget,
    extraInTarget: targetPool,
  };
}

function findBestMatch(
  source: NormalizedTransaction,
  pool: NormalizedTransaction[]
): { target: NormalizedTransaction; dateDiff: number } | null {
  const sourceAmount = getEffectiveAmount(source);
  const sourceDate = getEffectiveDate(source);

  if (!sourceDate || sourceAmount === 0) return null;

  let bestMatch: NormalizedTransaction | null = null;
  let bestDateDiff = Infinity;

  for (const candidate of pool) {
    const candidateAmount = getEffectiveAmount(candidate);
    const candidateDate = getEffectiveDate(candidate);

    if (!candidateDate) continue;
    if (!amountsMatch(sourceAmount, candidateAmount)) continue;

    const dateDiff = daysBetween(sourceDate, candidateDate);
    if (dateDiff > DATE_TOLERANCE_DAYS) continue;

    if (dateDiff < bestDateDiff) {
      bestMatch = candidate;
      bestDateDiff = dateDiff;
    }
  }

  if (!bestMatch) return null;

  return { target: bestMatch, dateDiff: bestDateDiff };
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(Math.abs(a) - Math.abs(b)) < 0.01;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function removeFromPool(pool: NormalizedTransaction[], item: NormalizedTransaction) {
  const index = pool.indexOf(item);
  if (index !== -1) {
    pool.splice(index, 1);
  }
}

function parseCSVFile(filepath: string): NormalizedTransaction[] {
  const content = readFileSync(filepath, "utf-8");
  return parseCSV(content);
}

export function parseCSV(content: string): NormalizedTransaction[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const transactions: NormalizedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }

    const normalized = normalizeRow(row);
    if (isValidTransaction(normalized)) {
      transactions.push(normalized);
    }
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  values.push(current);
  return values;
}

function isValidTransaction(txn: NormalizedTransaction): boolean {
  const hasDate = Boolean(txn.transactionDate || txn.chargeDate);
  const hasAmount = txn.outflow > 0 || txn.inflow > 0;
  return hasDate && hasAmount;
}

export function formatReconcileReport(result: ReconcileResult): string {
  const lines: string[] = [];

  lines.push(`Reconciliation: ${result.sourceFile} vs ${result.targetFile}`);
  lines.push("=".repeat(70));
  lines.push("");

  const exactMatches = result.matched.length;
  const flaggedMatches = result.flagged.length;
  const totalMatched = exactMatches + flaggedMatches;

  if (result.missingFromTarget.length === 0 && result.extraInTarget.length === 0) {
    lines.push("✓ All transactions reconciled");
    lines.push("");
  } else {
    lines.push("⚠ DISCREPANCIES FOUND");
    lines.push("");
  }

  if (result.flagged.length > 0) {
    lines.push(`MATCHED WITH DATE DISCREPANCY (${result.flagged.length}):`);
    for (const item of result.flagged) {
      const date = getEffectiveDate(item.source);
      const amount = formatAmount(getEffectiveAmount(item.source));
      const payee = truncate(item.source.payee, 30);
      lines.push(`  ⚠ ${date} | ${amount} | ${payee} (date diff: ${item.dateDiff} day${item.dateDiff !== 1 ? "s" : ""})`);
    }
    lines.push("");
  }

  if (result.missingFromTarget.length > 0) {
    lines.push(`MISSING FROM TARGET (${result.missingFromTarget.length}):`);
    for (const txn of result.missingFromTarget) {
      const date = getEffectiveDate(txn);
      const amount = formatAmount(getEffectiveAmount(txn));
      const payee = truncate(txn.payee, 30);
      lines.push(`  ✗ ${date} | ${amount} | ${payee}`);
    }
    lines.push("");
  }

  if (result.extraInTarget.length > 0) {
    lines.push(`EXTRA IN TARGET (${result.extraInTarget.length}):`);
    for (const txn of result.extraInTarget) {
      const date = getEffectiveDate(txn);
      const amount = formatAmount(getEffectiveAmount(txn));
      const payee = truncate(txn.payee, 30);
      lines.push(`  + ${date} | ${amount} | ${payee}`);
    }
    lines.push("");
  }

  lines.push("SUMMARY:");
  lines.push(`  Source transactions:  ${result.sourceCount}`);
  lines.push(`  Target transactions:  ${result.targetCount}`);
  lines.push(`  Exact matches:        ${exactMatches}`);
  lines.push(`  Flagged matches:      ${flaggedMatches}`);
  lines.push(`  Missing from target:  ${result.missingFromTarget.length}`);
  lines.push(`  Extra in target:      ${result.extraInTarget.length}`);

  return lines.join("\n");
}

function formatAmount(amount: number): string {
  const sign = amount < 0 ? "-" : " ";
  const abs = Math.abs(amount).toFixed(2);
  return `${sign}₪${abs.padStart(10)}`;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text.padEnd(maxLength);
  return text.slice(0, maxLength - 3) + "...";
}
