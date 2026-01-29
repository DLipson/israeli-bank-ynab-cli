import { describe, it, expect } from "vitest";
import { parseCSV, formatReconcileReport, type ReconcileResult } from "./reconcile.js";

describe("parseCSV", () => {
  it("parses YNAB format CSV", () => {
    const csv = `Date,Payee,Memo,Outflow,Inflow
2024-03-15,Super Pharm,,150.00,
2024-03-16,Salary,,,5000.00`;

    const transactions = parseCSV(csv);

    expect(transactions).toHaveLength(2);
    expect(transactions[0].transactionDate).toBe("2024-03-15");
    expect(transactions[0].payee).toBe("Super Pharm");
    expect(transactions[0].outflow).toBe(150);
    expect(transactions[1].inflow).toBe(5000);
  });

  it("parses Hebrew bank CSV", () => {
    const csv = `תאריך,תיאור,בחובה,בזכות
15/03/2024,סופר פארם,150.00,
16/03/2024,משכורת,,5000.00`;

    const transactions = parseCSV(csv);

    expect(transactions).toHaveLength(2);
    expect(transactions[0].chargeDate).toBe("2024-03-15");
    expect(transactions[0].payee).toBe("סופר פארם");
    expect(transactions[0].outflow).toBe(150);
  });

  it("handles quoted fields with commas", () => {
    const csv = `Date,Payee,Memo,Outflow,Inflow
2024-03-15,"Coffee, Tea & More",,50.00,`;

    const transactions = parseCSV(csv);

    expect(transactions[0].payee).toBe("Coffee, Tea & More");
  });

  it("handles escaped quotes", () => {
    const csv = `Date,Payee,Memo,Outflow,Inflow
2024-03-15,"Store ""Name""",,50.00,`;

    const transactions = parseCSV(csv);

    expect(transactions[0].payee).toBe('Store "Name"');
  });

  it("filters out invalid rows", () => {
    const csv = `Date,Payee,Memo,Outflow,Inflow
2024-03-15,Valid,,150.00,
,Invalid,,0,`;

    const transactions = parseCSV(csv);

    expect(transactions).toHaveLength(1);
    expect(transactions[0].payee).toBe("Valid");
  });

  it("returns empty array for empty input", () => {
    expect(parseCSV("")).toEqual([]);
    expect(parseCSV("Date,Payee")).toEqual([]);
  });
});

describe("formatReconcileReport", () => {
  it("shows success message when all matched", () => {
    const result: ReconcileResult = {
      sourceFile: "bank.csv",
      targetFile: "scraper.csv",
      sourceCount: 5,
      targetCount: 5,
      matched: [
        {
          source: makeTxn("2024-03-15", -100, "Store A"),
          target: makeTxn("2024-03-15", -100, "Store A"),
        },
      ],
      flagged: [],
      missingFromTarget: [],
      extraInTarget: [],
    };

    const report = formatReconcileReport(result);

    expect(report).toContain("✓ All transactions reconciled");
    expect(report).not.toContain("DISCREPANCIES");
  });

  it("shows discrepancy warning when transactions missing", () => {
    const result: ReconcileResult = {
      sourceFile: "bank.csv",
      targetFile: "scraper.csv",
      sourceCount: 5,
      targetCount: 4,
      matched: [],
      flagged: [],
      missingFromTarget: [makeTxn("2024-03-15", -100, "Missing Store")],
      extraInTarget: [],
    };

    const report = formatReconcileReport(result);

    expect(report).toContain("⚠ DISCREPANCIES FOUND");
    expect(report).toContain("MISSING FROM TARGET");
    expect(report).toContain("Missing Store");
  });

  it("shows flagged matches with date differences", () => {
    const result: ReconcileResult = {
      sourceFile: "bank.csv",
      targetFile: "scraper.csv",
      sourceCount: 1,
      targetCount: 1,
      matched: [],
      flagged: [
        {
          source: makeTxn("2024-03-15", -100, "Store"),
          target: makeTxn("2024-03-16", -100, "Store"),
          dateDiff: 1,
        },
      ],
      missingFromTarget: [],
      extraInTarget: [],
    };

    const report = formatReconcileReport(result);

    expect(report).toContain("MATCHED WITH DATE DISCREPANCY");
    expect(report).toContain("date diff: 1 day");
  });

  it("shows extra transactions in target", () => {
    const result: ReconcileResult = {
      sourceFile: "bank.csv",
      targetFile: "scraper.csv",
      sourceCount: 4,
      targetCount: 5,
      matched: [],
      flagged: [],
      missingFromTarget: [],
      extraInTarget: [makeTxn("2024-03-15", -100, "Extra Store")],
    };

    const report = formatReconcileReport(result);

    expect(report).toContain("EXTRA IN TARGET");
    expect(report).toContain("Extra Store");
  });

  it("includes summary statistics", () => {
    const result: ReconcileResult = {
      sourceFile: "bank.csv",
      targetFile: "scraper.csv",
      sourceCount: 10,
      targetCount: 9,
      matched: [],
      flagged: [],
      missingFromTarget: [makeTxn("2024-03-15", -100, "Missing")],
      extraInTarget: [],
    };

    const report = formatReconcileReport(result);

    expect(report).toContain("Source transactions:  10");
    expect(report).toContain("Target transactions:  9");
    expect(report).toContain("Missing from target:  1");
  });
});

function makeTxn(date: string, amount: number, payee: string) {
  return {
    transactionDate: date,
    chargeDate: "",
    payee,
    outflow: amount < 0 ? Math.abs(amount) : 0,
    inflow: amount > 0 ? amount : 0,
    originalAmount: null,
    notes: "",
    source: "",
  };
}
