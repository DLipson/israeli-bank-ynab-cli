# Israeli Bank YNAB Transformer

A GUI that scrapes Israeli bank and credit card accounts and transforms the data into YNAB-ready CSV files with correct timezone handling and Hebrew transaction support.

## Purpose

This project provides an interactive workflow to:

1. **Scrape** transactions from Israeli banks and credit cards
2. **Transform** Hebrew transaction data into YNAB's import format
3. **Export** clean CSV files ready for YNAB import
4. **Review** results before writing files

## The Problem

### Timezone Issues in Israeli Bank Scrapers

The [israeli-bank-scrapers](https://github.com/eshaham/israeli-bank-scrapers) library is the de facto standard for programmatically accessing Israeli bank data. However, it converts all transaction dates to UTC, losing the original Israel timezone context.

This causes problems when:
- Processing transactions outside Israel
- Running scheduled jobs on cloud servers in different timezones
- Transactions near midnight appear on the wrong date

**This project uses a modified version of israeli-bank-scrapers** that preserves the original `Asia/Jerusalem` timezone in ISO date strings (e.g., `2024-03-15T00:00:00+02:00` instead of `2024-03-14T22:00:00.000Z`).

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

This project adjusts installment dates to spread them across different days, preventing false duplicate detection while preserving all transaction metadata in the memo field.

## Why Not Use Caspion or Moneyman?

[Caspion](https://github.com/brafdlog/caspion) and [Moneyman](https://github.com/daniel-hauser/moneyman) are excellent tools that also use israeli-bank-scrapers. Here's how this project differs:

| Feature | This Project | Caspion | Moneyman |
|---------|--------------|---------|----------|
| **Focus** | YNAB export via GUI | Full desktop app | Multi-destination automation |
| **Complexity** | ~300 lines (core logic) | ~15,000+ lines | ~5,000+ lines |
| **Timezone fix** | Built-in (modified scrapers) | Requires patching | Requires patching |
| **Hebrew installment handling** | Custom date spreading | Standard export | Standard export |
| **Metadata preservation** | JSON memo field | Limited | Limited |
| **Dependencies** | Minimal | Electron, React, MobX | Multiple export SDKs |
| **Use case** | Interactive GUI | Interactive desktop use | Cloud automation |

## Features

- **GUI-first workflow** for scraping, review, and export
- **Correct timezone handling** - Dates preserve Israel timezone
- **Hebrew column mapping** - Automatic translation of 50+ Hebrew column variations
- **Installment support** - Detects `תשלום X מ-Y` patterns and adjusts dates
- **Metadata preservation** - Transaction details stored as JSON in YNAB memo field
- **Multiple banks** - Supports all banks from israeli-bank-scrapers
- **Flexible output** - Single merged CSV or separate files per account
- **Audit logging** - Per-run logs with transaction counts, skipped items, and checksums
- **Reconciliation** - Compare bank CSVs against scraper output to verify accuracy

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
   git clone <this-repo-url> israeli-bank-ynab-transformer
   cd israeli-bank-ynab-transformer
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

## Quick Start (GUI)

Run the API server and GUI together:

```bash
npm run dev:all
```

This starts:
- API server at `http://localhost:3001`
- GUI at Vite's default dev server (typically `http://localhost:5173`)

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

The project uses your modified israeli-bank-scrapers to fetch transactions. Each bank scraper:
- Launches a Puppeteer browser
- Logs into your bank account
- Navigates to transaction history
- Extracts transaction data
- Returns structured transaction objects with preserved timezone

### 2. Transformation

Each transaction goes through the transformation pipeline:

```
Bank Transaction -> Normalize Dates -> Detect Installments -> Build YNAB Row -> Write CSV
```

**Date Normalization:**
- Parses various date formats (DD/MM/YYYY, DD-MM-YY, ISO)
- Outputs consistent YYYY-MM-DD format
- Preserves timezone information from scraper

**Installment Detection:**
- Regex patterns match Hebrew installment notation
- `תשלום 2 מ-12` -> `{ number: 2, total: 12 }`
- Date adjusted to prevent YNAB duplicate detection

**YNAB Row Mapping:**
- `date` -> processedDate (charge date) or transaction date
- `payee` -> description
- `outflow` -> negative chargedAmount (expenses)
- `inflow` -> positive chargedAmount (deposits/refunds)
- `memo` -> JSON with all other metadata

### 3. Output

Transactions are sorted by date (newest first) and written to CSV with proper escaping for YNAB compatibility.

## Timezone Modification

To fix timezone handling in israeli-bank-scrapers, apply these changes:

### 1. Set Default Timezone

In `src/scrapers/base-scraper.ts`, add at the top:

```typescript
import moment from "moment-timezone";
moment.tz.setDefault("Asia/Jerusalem");
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

Then reinstall this project:

```bash
cd ../israeli-bank-ynab-transformer
rm -rf node_modules package-lock.json
npm install
```

### "No accounts enabled for scraping"

Check that your `.env` file exists and has credentials.

### Browser Crashes or Timeouts

Common issues:
- Bank website changed (may need scraper update)
- Two-factor authentication prompt
- CAPTCHA or bot detection
- Network issues

### Incorrect Dates

Verify your israeli-bank-scrapers has the timezone modifications applied. Check that dates in the output have the correct day (not off by one).

## Project Structure

```
israeli-bank-ynab-transformer/
├── gui/                           # React GUI (Vite)
├── src/
│   ├── server/                    # Express API server for the GUI
│   ├── config.ts                  # Account configuration from env vars
│   ├── scraper.ts                 # Wrapper around israeli-bank-scrapers
│   ├── transformer.ts             # YNAB transformation logic
│   ├── csv-writer.ts              # CSV output utilities
│   ├── reconcile.ts               # CSV comparison and reporting
│   ├── column-standardization.ts  # Hebrew/English column mapping
│   ├── audit-logger.ts            # Per-run logging with auto-cleanup
│   └── *.test.ts                  # Tests
├── logs/                          # Audit logs (auto-cleaned after 14 days)
├── output/                        # Generated CSV files
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Development

```bash
# Run API server + GUI
npm run dev:all

# Build TypeScript
npm run build

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
