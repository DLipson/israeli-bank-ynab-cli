# Israeli Bank YNAB CLI

A command-line tool that scrapes Israeli bank and credit card accounts and transforms the data into YNAB-ready CSV files with correct timezone handling and Hebrew transaction support.

## Purpose

This tool provides a streamlined workflow for Israeli YNAB users:

1. **Scrape** transactions from Israeli banks and credit cards
2. **Transform** Hebrew transaction data into YNAB's import format
3. **Export** clean CSV files ready for YNAB import

## The Problem

### Timezone Issues in Israeli Bank Scrapers

The [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) library is the de facto standard for programmatically accessing Israeli bank data. However, it converts all transaction dates to UTC, losing the original Israel timezone context.

This causes problems when:
- Processing transactions outside Israel
- Running scheduled jobs on cloud servers in different timezones
- Transactions near midnight appear on the wrong date

**This tool uses a modified version of israeli-bank-scrapers** that preserves the original `Asia/Jerusalem` timezone in ISO date strings (e.g., `2024-03-15T00:00:00+02:00` instead of `2024-03-14T22:00:00.000Z`).

### Hebrew Transaction Data

Israeli bank exports contain:
- Hebrew column headers (`תאריך`, `תיאור`, `סכום`)
- Hebrew installment notation (`תשלום 2 מ-12`)
- Multiple date formats (`DD/MM/YYYY`, `DD-MM-YY`, etc.)
- Separate charge dates vs. transaction dates

YNAB expects:
- English headers (`Date`, `Payee`, `Outflow`, `Inflow`, `Memo`)
- Dates in `YYYY-MM-DD` format
- A single date field

### Installment Transaction Duplicates

Credit card installments (`תשלומים`) create a common problem: YNAB sees multiple transactions with the same date and similar amounts, flagging them as duplicates.

This tool adjusts installment dates to spread them across different days, preventing false duplicate detection while preserving all transaction metadata in the memo field.

## Why Not Use Caspion or Moneyman?

[Caspion](https://github.com/brafdlog/caspion) and [Moneyman](https://github.com/daniel-hauser/moneyman) are excellent tools that also use israeli-bank-scrapers. Here's how this CLI differs:

| Feature | This CLI | Caspion | Moneyman |
|---------|----------|---------|----------|
| **Focus** | Single-purpose YNAB export | Full desktop app | Multi-destination automation |
| **Complexity** | ~300 lines | ~15,000+ lines | ~5,000+ lines |
| **Timezone fix** | Built-in (modified scrapers) | Requires patching | Requires patching |
| **Hebrew installment handling** | Custom date spreading | Standard export | Standard export |
| **Metadata preservation** | JSON memo field | Limited | Limited |
| **Dependencies** | Minimal | Electron, React, MobX | Multiple export SDKs |
| **Use case** | CLI/scripting/cron | Interactive desktop use | Cloud automation |

**Choose this CLI if you:**
- Want a simple, scriptable tool for YNAB import
- Need correct timezone handling without patching dependencies
- Want full control over the transformation logic
- Prefer minimal dependencies
- Run scraping from scripts or cron jobs

**Choose Caspion if you:**
- Want a desktop GUI
- Need encrypted credential storage
- Want built-in scheduling with a visual interface

**Choose Moneyman if you:**
- Export to multiple destinations (Google Sheets, Actual Budget, Buxfer, etc.)
- Run automated scrapes via GitHub Actions
- Want Telegram notifications

## Features

- **Correct timezone handling** - Dates preserve Israel timezone
- **Hebrew column mapping** - Automatic translation of 50+ Hebrew column variations
- **Installment support** - Detects `תשלום X מ-Y` patterns and adjusts dates
- **Metadata preservation** - Transaction details stored as JSON in YNAB memo field
- **Multiple banks** - Supports all banks from israeli-bank-scrapers:
  - Leumi, Hapoalim, Discount, Mizrahi, Mercantile, Otsar Hahayal
  - Max, Visa Cal, Isracard, Amex
  - And more
- **Flexible output** - Single merged CSV or separate files per account
- **Audit logging** - Per-run logs with transaction counts, skipped items, and checksums
- **Reconciliation** - Compare bank CSVs against scraper output to verify accuracy
- **Dry-run mode** - Preview what would be exported without writing files

## Installation

### Prerequisites

- Node.js 22.12.0 or higher
- A local clone of [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) with timezone modifications

### Setup

1. **Clone and build the modified israeli-bank-scrapers:**

   ```bash
   cd ~/Dev  # or your preferred directory
   git clone https://github.com/eshaham/israeli-bank-scrapers.git
   cd israeli-bank-scrapers

   # Apply timezone fix (see "Timezone Modification" section below)

   npm install
   npm run build
   ```

2. **Clone this repository:**

   ```bash
   cd ~/Dev
   git clone <this-repo-url> israeli-bank-ynab-cli
   cd israeli-bank-ynab-cli
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Configure credentials:**

   ```bash
   cp .env.example .env
   # Edit .env with your bank credentials
   ```

## Configuration

Create a `.env` file with your bank credentials. Only configure the banks you use:

```env
# Leumi Bank
LEUMI_USERNAME=your_username
LEUMI_PASSWORD=your_password

# Hapoalim Bank
HAPOALIM_USERCODE=your_usercode
HAPOALIM_PASSWORD=your_password

# Discount Bank
DISCOUNT_ID=your_id
DISCOUNT_PASSWORD=your_password
DISCOUNT_NUM=your_num

# Mizrahi Bank
MIZRAHI_USERNAME=your_username
MIZRAHI_PASSWORD=your_password

# Max (Leumi Card)
MAX_USERNAME=your_username
MAX_PASSWORD=your_password

# Visa Cal
VISACAL_USERNAME=your_username
VISACAL_PASSWORD=your_password

# Isracard
ISRACARD_ID=your_id
ISRACARD_CARD6DIGITS=123456
ISRACARD_PASSWORD=your_password

# Output directory (optional)
OUTPUT_DIR=./output
```

Accounts are automatically enabled when credentials are present.

## Usage

### List Configured Accounts

```bash
npm run dev list-accounts
```

### Scrape All Accounts

```bash
# Scrape last 60 days (default)
npm run scrape

# Scrape last 90 days
npm run scrape -- --days-back 90

# Show browser during scraping (for debugging)
npm run scrape:show

# Output to specific directory
npm run scrape -- --output ./my-exports

# Generate separate CSV per account
npm run scrape -- --split
```

### CLI Options

```
Usage: israeli-bank-ynab scrape [options]

Options:
  -d, --days-back <days>  Number of days to scrape (default: "60")
  -s, --show-browser      Show browser window during scraping
  -o, --output <dir>      Output directory (default: "./output")
  --split                 Generate separate CSV per account
  --dry-run               Preview without writing files
  -h, --help              Display help
```

### Dry Run Mode

Preview what would be exported without writing any files:

```bash
npm run scrape -- --dry-run
```

Output shows transaction counts and totals per account.

### Reconciliation

Compare a bank CSV export against scraper output to verify nothing was missed or duplicated:

```bash
# Compare bank export against scraper output
npm run dev reconcile bank-export.csv scraper-output.csv
```

The reconcile command:
- Parses both CSVs (supports Hebrew bank formats and YNAB format)
- Matches transactions by amount and date
- Flags matches with 1-2 day date differences
- Reports missing and extra transactions

Example output:

```
Reconciliation: bank-export.csv vs scraper-output.csv
======================================================================

⚠ DISCREPANCIES FOUND

MATCHED WITH DATE DISCREPANCY (1):
  ⚠ 2024-03-15 |  -₪   200.00 | קפה גרג                        (date diff: 1 day)

MISSING FROM TARGET (1):
  ✗ 2024-03-18 |  -₪    45.00 | אושר עד

SUMMARY:
  Source transactions:  47
  Target transactions:  46
  Exact matches:        45
  Flagged matches:       1
  Missing from target:   1
  Extra in target:       0
```

### Audit Logging

Every scrape run creates a log file in `./logs/` with:
- Transaction counts per account
- Skipped transactions (pending, zero amount) with reasons
- Output file path and checksum
- Total inflow/outflow

Logs older than 14 days are automatically deleted.

Example log:

```
=== Scrape Run: 2024-03-15T10:30:45 ===

Accounts:
  Max: 23 transactions (₪4,520.00 out, ₪0.00 in)
  Leumi: 31 transactions (₪8,120.00 out, ₪350.00 in)

Skipped (2):
  - Pending: "סופר פארם" ₪45.00 (2024-03-14)
  - Zero amount: "ביטול עסקה" ₪0.00 (2024-03-12)

Output: ./output/ynab-transactions-2024-03-15T10-30-45.csv
  52 transactions
  Total: ₪12,640.00 outflow, ₪350.00 inflow

Checksum: a1b2c3d4e5f6g7h8
```

## Output Format

### CSV Structure

The output CSV is ready for YNAB import:

```csv
Date,Payee,Memo,Outflow,Inflow
2024-03-15,סופר פארם,"{""chargeDate"":""2024-03-15"",""ref"":""12345"",""source"":""Max""}",150.00,
2024-03-14,העברה מחשבון,"{""chargeDate"":""2024-03-14"",""account"":""1234""}",0,5000.00
```

### Memo Field

Transaction metadata is preserved as JSON in the memo field:

| Field | Description |
|-------|-------------|
| `transactionDate` | Original transaction date (if different from charge date) |
| `chargeDate` | When the charge was processed |
| `installment` | Installment info, e.g., `"2/12"` |
| `originalAmount` | Amount in original currency (for foreign transactions) |
| `originalCurrency` | Original currency code |
| `ref` | Bank reference number (אסמכתא) |
| `account` | Account number |
| `source` | Bank/card name |
| `type` | Transaction type (if not "normal") |
| `category` | Bank-assigned category |
| `bankMemo` | Additional notes from bank |

## How It Works

### 1. Scraping

The tool uses your modified israeli-bank-scrapers to fetch transactions. Each bank scraper:
- Launches a Puppeteer browser
- Logs into your bank account
- Navigates to transaction history
- Extracts transaction data
- Returns structured transaction objects with preserved timezone

### 2. Transformation

Each transaction goes through the transformation pipeline:

```
Bank Transaction → Normalize Dates → Detect Installments → Build YNAB Row → Write CSV
```

**Date Normalization:**
- Parses various date formats (DD/MM/YYYY, DD-MM-YY, ISO)
- Outputs consistent YYYY-MM-DD format
- Preserves timezone information from scraper

**Installment Detection:**
- Regex patterns match Hebrew installment notation
- `תשלום 2 מ-12` → `{ number: 2, total: 12 }`
- Date adjusted to prevent YNAB duplicate detection

**YNAB Row Mapping:**
- `date` ← processedDate (charge date) or transaction date
- `payee` ← description
- `outflow` ← negative chargedAmount (expenses)
- `inflow` ← positive chargedAmount (deposits/refunds)
- `memo` ← JSON with all other metadata

### 3. Output

Transactions are sorted by date (newest first) and written to CSV with proper escaping for YNAB compatibility.

## Timezone Modification

To fix timezone handling in israeli-bank-scrapers, apply these changes:

### 1. Set Default Timezone

In `src/scrapers/base-scraper.ts`, add at the top:

```typescript
import moment from 'moment-timezone';
moment.tz.setDefault('Asia/Jerusalem');
```

### 2. Preserve Timezone in ISO Strings

In all scraper files, change `.toISOString()` to `.toISOString(true)`:

```typescript
// Before
date: moment(txn.eventDate, DATE_FORMAT).toISOString(),

// After
date: moment(txn.eventDate, DATE_FORMAT).toISOString(true),
```

Files to modify:
- `src/scrapers/hapoalim.ts`
- `src/scrapers/leumi.ts`
- `src/scrapers/discount.ts`
- `src/scrapers/mizrahi.ts`
- `src/scrapers/max.ts`
- `src/scrapers/visa-cal.ts`
- `src/scrapers/isracard.ts`
- `src/scrapers/base-isracard-amex.ts`
- `src/helpers/transactions.ts`
- (and other scraper files)

The `true` parameter tells moment to preserve the timezone offset in the ISO string output instead of converting to UTC.

## Troubleshooting

### "Cannot find package israeli-bank-scrapers"

Make sure you've built the scrapers library:

```bash
cd ../israeli-bank-scrapers
npm install
npm run build
```

Then reinstall this CLI:

```bash
cd ../israeli-bank-ynab-cli
rm -rf node_modules package-lock.json
npm install
```

### "No accounts enabled for scraping"

Check that your `.env` file exists and has credentials:

```bash
npm run dev list-accounts
```

### Browser Crashes or Timeouts

Try running with the browser visible to see what's happening:

```bash
npm run scrape:show
```

Common issues:
- Bank website changed (may need scraper update)
- Two-factor authentication prompt
- CAPTCHA or bot detection
- Network issues

### Incorrect Dates

Verify your israeli-bank-scrapers has the timezone modifications applied. Check that dates in the output have the correct day (not off by one).

## Project Structure

```
israeli-bank-ynab-cli/
├── src/
│   ├── index.ts                  # CLI entry point (commander)
│   ├── config.ts                 # Account configuration from env vars
│   ├── scraper.ts                # Wrapper around israeli-bank-scrapers
│   ├── transformer.ts            # YNAB transformation logic
│   ├── csv-writer.ts             # CSV output utilities
│   ├── reconcile.ts              # CSV comparison and reporting
│   ├── column-standardization.ts # Hebrew/English column mapping
│   ├── audit-logger.ts           # Per-run logging with auto-cleanup
│   └── *.test.ts                 # Tests (100 total)
├── logs/                         # Audit logs (auto-cleaned after 14 days)
├── output/                       # Generated CSV files
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Development

```bash
# Run in development mode
npm run dev list-accounts
npm run dev scrape# Build TypeScript
npm run build

# Run built version
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run typecheck
```

## License

MIT

## Acknowledgments

- [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) - The foundation for Israeli bank access
- [Caspion](https://github.com/brafdlog/caspion) - Inspiration for the overall approach
- [Moneyman](https://github.com/daniel-hauser/moneyman) - Reference for multi-destination patterns
