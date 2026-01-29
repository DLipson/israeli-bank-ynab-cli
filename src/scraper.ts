import { createScraper, type ScraperOptions } from "israeli-bank-scrapers";
import type { AccountConfig } from "./config.js";
import type { EnrichedTransaction } from "./transformer.js";

export interface ScrapeResult {
  accountName: string;
  success: boolean;
  transactions: EnrichedTransaction[];
  error?: string;
}

/**
 * Scrape a single account
 */
export async function scrapeAccount(
  account: AccountConfig,
  startDate: Date,
  showBrowser: boolean
): Promise<ScrapeResult> {
  console.log(`\nScraping ${account.name}...`);

  const options: ScraperOptions = {
    companyId: account.companyId,
    startDate,
    combineInstallments: false, // Keep installments separate for proper YNAB handling
    showBrowser,
    verbose: false,
  };

  try {
    const scraper = createScraper(options);

    // Set up progress logging
    scraper.onProgress((companyId, payload) => {
      console.log(`  [${account.name}] ${payload.type}`);
    });

    const result = await scraper.scrape(account.credentials);

    if (!result.success) {
      console.error(`  Error: ${result.errorType} - ${result.errorMessage}`);
      return {
        accountName: account.name,
        success: false,
        transactions: [],
        error: `${result.errorType}: ${result.errorMessage}`,
      };
    }

    // Collect and enrich transactions from all sub-accounts
    const transactions: EnrichedTransaction[] = [];

    for (const bankAccount of result.accounts ?? []) {
      console.log(`  Found ${bankAccount.txns.length} transactions in account ${bankAccount.accountNumber}`);

      for (const txn of bankAccount.txns) {
        transactions.push({
          ...txn,
          accountNumber: bankAccount.accountNumber,
          accountName: account.name,
        });
      }
    }

    console.log(`  Total: ${transactions.length} transactions from ${account.name}`);

    return {
      accountName: account.name,
      success: true,
      transactions,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  Exception: ${message}`);
    return {
      accountName: account.name,
      success: false,
      transactions: [],
      error: message,
    };
  }
}

/**
 * Scrape all enabled accounts
 */
export async function scrapeAllAccounts(
  accounts: AccountConfig[],
  startDate: Date,
  showBrowser: boolean
): Promise<ScrapeResult[]> {
  const enabledAccounts = accounts.filter((a) => a.enabled);

  if (enabledAccounts.length === 0) {
    console.log("No accounts enabled for scraping.");
    return [];
  }

  console.log(`\nScraping ${enabledAccounts.length} account(s)...`);
  console.log(`Start date: ${startDate.toISOString().split("T")[0]}`);

  const results: ScrapeResult[] = [];

  // Scrape accounts sequentially to avoid overwhelming the browser
  for (const account of enabledAccounts) {
    const result = await scrapeAccount(account, startDate, showBrowser);
    results.push(result);
  }

  // Summary
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const totalTxns = results.reduce((sum, r) => sum + r.transactions.length, 0);

  console.log(`\n--- Summary ---`);
  console.log(`Successful: ${successful.length}/${results.length} accounts`);
  console.log(`Total transactions: ${totalTxns}`);

  if (failed.length > 0) {
    console.log(`\nFailed accounts:`);
    for (const f of failed) {
      console.log(`  - ${f.accountName}: ${f.error}`);
    }
  }

  return results;
}
