#!/usr/bin/env node
import { program } from "commander";
import { loadConfig } from "./config.js";
import { scrapeAllAccounts } from "./scraper.js";
import { transformTransactions, shouldSkipTransaction, type EnrichedTransaction } from "./transformer.js";
import { writeCSV, writeCSVPerAccount, toCSV } from "./csv-writer.js";
import { createAuditLogger } from "./audit-logger.js";
import { reconcile, formatReconcileReport } from "./reconcile.js";

program
  .name("israeli-bank-ynab")
  .description("Scrape Israeli bank accounts and export to YNAB-ready CSV")
  .version("1.0.0");

program
  .command("scrape")
  .description("Scrape all configured accounts and generate YNAB CSV")
  .option("-d, --days-back <days>", "Number of days to scrape", "60")
  .option("-s, --show-browser", "Show browser window during scraping", false)
  .option("-o, --output <dir>", "Output directory", "./output")
  .option("--split", "Generate separate CSV per account", false)
  .option("--dry-run", "Preview what would be exported without writing files", false)
  .action(async (options) => {
    const config = loadConfig({
      showBrowser: options.showBrowser,
      daysBack: parseInt(options.daysBack, 10),
    });

    if (options.output) {
      config.outputDir = options.output;
    }

    const auditLogger = createAuditLogger();
    const results = await scrapeAllAccounts(
      config.accounts,
      config.startDate,
      config.showBrowser
    );

    auditLogger.recordScrapeResults(results);

    const allTransactions: EnrichedTransaction[] = [];
    for (const result of results) {
      if (result.success) {
        for (const txn of result.transactions) {
          if (shouldSkipTransaction(txn)) {
            const reason = txn.status === "pending" ? "Pending" : "Zero amount";
            auditLogger.recordSkipped(txn, reason);
          } else {
            allTransactions.push(txn);
          }
        }
      }
    }

    if (allTransactions.length === 0) {
      console.log("\nNo transactions to export.");
      auditLogger.save();
      return;
    }

    console.log(`\nTransforming ${allTransactions.length} transactions to YNAB format...`);

    if (options.dryRun) {
      printDryRunSummary(allTransactions);
      console.log("\n[Dry run - no files written]");
      auditLogger.save();
      return;
    }

    if (options.split) {
      const byAccount = groupByAccount(allTransactions);
      const rowsByAccount = new Map<string, ReturnType<typeof transformTransactions>>();

      for (const [account, txns] of byAccount) {
        rowsByAccount.set(account, transformTransactions(txns));
      }

      const paths = writeCSVPerAccount(rowsByAccount, config.outputDir);
      console.log(`\nWrote ${paths.length} CSV file(s):`);
      for (const path of paths) {
        console.log(`  ${path}`);
      }

      const allRows = Array.from(rowsByAccount.values()).flat();
      auditLogger.recordOutput(allRows, paths.join(", "), "");
    } else {
      const rows = transformTransactions(allTransactions);
      const csvContent = toCSV(rows);
      const outputPath = writeCSV(rows, config.outputDir);

      console.log(`\nWrote ${rows.length} transactions to:`);
      console.log(`  ${outputPath}`);

      auditLogger.recordOutput(rows, outputPath, csvContent);
    }

    const logPath = auditLogger.save();
    console.log(`\nAudit log saved to: ${logPath}`);
    console.log("\nDone!");
  });

program
  .command("reconcile")
  .description("Compare bank CSV against scraper output to verify nothing was missed or duplicated")
  .argument("<source>", "Source CSV file (e.g., bank export)")
  .argument("<target>", "Target CSV file (e.g., scraper output)")
  .action((source, target) => {
    console.log(`\nReconciling: ${source} vs ${target}\n`);

    try {
      const result = reconcile(source, target);
      const report = formatReconcileReport(result);
      console.log(report);

      const hasDiscrepancies = result.missingFromTarget.length > 0 || result.extraInTarget.length > 0;
      process.exitCode = hasDiscrepancies ? 1 : 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error: ${message}`);
      process.exitCode = 1;
    }
  });

program
  .command("list-accounts")
  .description("List configured accounts and their status")
  .action(() => {
    const config = loadConfig();

    console.log("\nConfigured accounts:\n");
    for (const account of config.accounts) {
      const status = account.enabled ? "enabled" : "disabled (missing credentials)";
      console.log(`  ${account.name}: ${status}`);
    }
    console.log("\nTo enable accounts, add credentials to .env file.");
  });

program.action(() => {
  program.help();
});

program.parse();

function groupByAccount(transactions: EnrichedTransaction[]): Map<string, EnrichedTransaction[]> {
  const byAccount = new Map<string, EnrichedTransaction[]>();

  for (const txn of transactions) {
    const key = txn.accountName ?? "unknown";
    const list = byAccount.get(key) ?? [];
    list.push(txn);
    byAccount.set(key, list);
  }

  return byAccount;
}

function printDryRunSummary(transactions: EnrichedTransaction[]) {
  const byAccount = groupByAccount(transactions);

  console.log("\n--- Dry Run Summary ---");

  let totalOutflow = 0;
  let totalInflow = 0;

  for (const [account, txns] of byAccount) {
    let outflow = 0;
    let inflow = 0;

    for (const txn of txns) {
      const amount = txn.chargedAmount ?? 0;
      if (amount < 0) outflow += Math.abs(amount);
      if (amount > 0) inflow += amount;
    }

    totalOutflow += outflow;
    totalInflow += inflow;

    console.log(`\n${account}: ${txns.length} transactions`);
    console.log(`  Outflow: ₪${outflow.toFixed(2)}`);
    console.log(`  Inflow: ₪${inflow.toFixed(2)}`);
  }

  console.log("\n--- Totals ---");
  console.log(`Transactions: ${transactions.length}`);
  console.log(`Outflow: ₪${totalOutflow.toFixed(2)}`);
  console.log(`Inflow: ₪${totalInflow.toFixed(2)}`);
}
