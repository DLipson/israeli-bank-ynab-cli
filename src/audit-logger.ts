import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { EnrichedTransaction, YnabRow } from "./transformer.js";
import type { ScrapeResult } from "./scraper.js";

export interface SkippedTransaction {
  reason: string;
  description: string;
  amount: number;
  date: string;
}

export interface AccountSummary {
  name: string;
  transactionCount: number;
  totalOutflow: number;
  totalInflow: number;
}

export interface AuditLog {
  timestamp: string;
  accounts: AccountSummary[];
  skipped: SkippedTransaction[];
  outputFile: string | null;
  outputTransactionCount: number;
  totalOutflow: number;
  totalInflow: number;
  checksum: string | null;
}

const DEFAULT_LOG_DIR = "./logs";
const DEFAULT_RETENTION_DAYS = 14;

export function createAuditLogger(logDir: string = DEFAULT_LOG_DIR) {
  const log: AuditLog = {
    timestamp: new Date().toISOString(),
    accounts: [],
    skipped: [],
    outputFile: null,
    outputTransactionCount: 0,
    totalOutflow: 0,
    totalInflow: 0,
    checksum: null,
  };

  return {
    recordScrapeResults(results: ScrapeResult[]) {
      for (const result of results) {
        if (!result.success) continue;

        let outflow = 0;
        let inflow = 0;

        for (const txn of result.transactions) {
          const amount = txn.chargedAmount ?? 0;
          if (amount < 0) outflow += Math.abs(amount);
          if (amount > 0) inflow += amount;
        }

        log.accounts.push({
          name: result.accountName,
          transactionCount: result.transactions.length,
          totalOutflow: outflow,
          totalInflow: inflow,
        });
      }
    },

    recordSkipped(txn: EnrichedTransaction, reason: string) {
      log.skipped.push({
        reason,
        description: txn.description,
        amount: txn.chargedAmount ?? 0,
        date: txn.processedDate ?? txn.date ?? "unknown",
      });
    },

    recordOutput(rows: YnabRow[], outputPath: string, csvContent: string) {
      log.outputFile = outputPath;
      log.outputTransactionCount = rows.length;

      for (const row of rows) {
        const outflow = parseFloat(row.outflow) || 0;
        const inflow = parseFloat(row.inflow) || 0;
        log.totalOutflow += outflow;
        log.totalInflow += inflow;
      }

      log.checksum = createHash("sha256").update(csvContent).digest("hex").slice(0, 16);
    },

    save(): string {
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      cleanOldLogs(logDir, DEFAULT_RETENTION_DAYS);

      const filename = `run-${log.timestamp.replace(/:/g, "-").replace(/\.\d{3}Z$/, "")}.log`;
      const filepath = join(logDir, filename);

      const content = formatAuditLog(log);
      writeFileSync(filepath, content, "utf-8");

      return filepath;
    },

    getLog(): AuditLog {
      return log;
    },
  };
}

function formatAuditLog(log: AuditLog): string {
  const lines: string[] = [];

  lines.push(`=== Scrape Run: ${log.timestamp} ===`);
  lines.push("");

  lines.push("Accounts:");
  if (log.accounts.length === 0) {
    lines.push("  (none)");
  } else {
    for (const account of log.accounts) {
      const outflow = formatCurrency(account.totalOutflow);
      const inflow = formatCurrency(account.totalInflow);
      lines.push(`  ${account.name}: ${account.transactionCount} transactions (${outflow} out, ${inflow} in)`);
    }
  }
  lines.push("");

  lines.push(`Skipped (${log.skipped.length}):`);
  if (log.skipped.length === 0) {
    lines.push("  (none)");
  } else {
    for (const skipped of log.skipped) {
      const amount = formatCurrency(Math.abs(skipped.amount));
      const date = skipped.date.split("T")[0];
      lines.push(`  - ${skipped.reason}: "${skipped.description}" ${amount} (${date})`);
    }
  }
  lines.push("");

  if (log.outputFile) {
    lines.push(`Output: ${log.outputFile}`);
    lines.push(`  ${log.outputTransactionCount} transactions`);
    lines.push(`  Total: ${formatCurrency(log.totalOutflow)} outflow, ${formatCurrency(log.totalInflow)} inflow`);
    lines.push("");
    lines.push(`Checksum: ${log.checksum}`);
  } else {
    lines.push("Output: (none - dry run or no transactions)");
  }

  return lines.join("\n");
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cleanOldLogs(logDir: string, retentionDays: number) {
  if (!existsSync(logDir)) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  try {
    const files = readdirSync(logDir);
    for (const file of files) {
      if (!file.startsWith("run-") || !file.endsWith(".log")) continue;

      const filepath = join(logDir, file);
      const stats = statSync(filepath);

      if (stats.mtimeMs < cutoff) {
        unlinkSync(filepath);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
