import { describe, it, expect } from "vitest";
import {
  normalizeColumnName,
  normalizeDate,
  normalizeAmount,
  normalizeRow,
  getEffectiveDate,
  getEffectiveAmount,
} from "./column-standardization.js";

describe("normalizeColumnName", () => {
  it("maps Hebrew bank columns", () => {
    expect(normalizeColumnName("תאריך")).toBe("chargeDate");
    expect(normalizeColumnName("תיאור")).toBe("payee");
    expect(normalizeColumnName("שם בית העסק")).toBe("payee");
    expect(normalizeColumnName("סכום החיוב")).toBe("outflow");
  });

  it("maps English columns", () => {
    expect(normalizeColumnName("Date")).toBe("transactionDate");
    expect(normalizeColumnName("Payee")).toBe("payee");
    expect(normalizeColumnName("Outflow")).toBe("outflow");
    expect(normalizeColumnName("Inflow")).toBe("inflow");
  });

  it("maps scraper output columns", () => {
    expect(normalizeColumnName("date")).toBe("transactionDate");
    expect(normalizeColumnName("processedDate")).toBe("chargeDate");
    expect(normalizeColumnName("description")).toBe("payee");
    expect(normalizeColumnName("chargedAmount")).toBe("outflow");
  });

  it("returns null for unknown columns", () => {
    expect(normalizeColumnName("unknown")).toBeNull();
    expect(normalizeColumnName("")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(normalizeColumnName("  תאריך  ")).toBe("chargeDate");
  });
});

describe("normalizeDate", () => {
  it("parses DD/MM/YYYY format", () => {
    expect(normalizeDate("15/03/2024")).toBe("2024-03-15");
    expect(normalizeDate("1/1/2024")).toBe("2024-01-01");
  });

  it("parses DD-MM-YYYY format", () => {
    expect(normalizeDate("15-03-2024")).toBe("2024-03-15");
  });

  it("parses DD.MM.YYYY format", () => {
    expect(normalizeDate("15.03.2024")).toBe("2024-03-15");
  });

  it("handles two-digit years", () => {
    expect(normalizeDate("15/03/24")).toBe("2024-03-15");
    expect(normalizeDate("15/03/99")).toBe("1999-03-15");
  });

  it("parses ISO format", () => {
    expect(normalizeDate("2024-03-15")).toBe("2024-03-15");
    expect(normalizeDate("2024-03-15T00:00:00+02:00")).toBe("2024-03-15");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeDate("")).toBe("");
    expect(normalizeDate("  ")).toBe("");
  });
});

describe("normalizeAmount", () => {
  it("parses positive numbers", () => {
    expect(normalizeAmount("150")).toBe(150);
    expect(normalizeAmount("150.50")).toBe(150.5);
  });

  it("parses negative numbers", () => {
    expect(normalizeAmount("-150")).toBe(-150);
    expect(normalizeAmount("-150.50")).toBe(-150.5);
  });

  it("removes currency symbols", () => {
    expect(normalizeAmount("₪150")).toBe(150);
    expect(normalizeAmount("$150")).toBe(150);
    expect(normalizeAmount("€150")).toBe(150);
  });

  it("removes commas", () => {
    expect(normalizeAmount("1,500.00")).toBe(1500);
    expect(normalizeAmount("₪1,500.00")).toBe(1500);
  });

  it("returns 0 for invalid input", () => {
    expect(normalizeAmount("")).toBe(0);
    expect(normalizeAmount("abc")).toBe(0);
  });
});

describe("normalizeRow", () => {
  it("normalizes a Hebrew bank row", () => {
    const row = {
      "תאריך": "15/03/2024",
      "תיאור": "סופר פארם",
      "בחובה": "150.00",
    };

    const normalized = normalizeRow(row);

    expect(normalized.chargeDate).toBe("2024-03-15");
    expect(normalized.payee).toBe("סופר פארם");
    expect(normalized.outflow).toBe(150);
  });

  it("normalizes a YNAB CSV row", () => {
    const row = {
      "Date": "2024-03-15",
      "Payee": "Super Pharm",
      "Outflow": "150.00",
      "Inflow": "",
      "Memo": "test",
    };

    const normalized = normalizeRow(row);

    expect(normalized.transactionDate).toBe("2024-03-15");
    expect(normalized.payee).toBe("Super Pharm");
    expect(normalized.outflow).toBe(150);
    expect(normalized.notes).toBe("test");
  });

  it("handles negative amounts as outflow", () => {
    const row = {
      "date": "2024-03-15",
      "chargedAmount": "-150",
    };

    const normalized = normalizeRow(row);

    expect(normalized.outflow).toBe(150);
  });

  it("concatenates multiple notes fields", () => {
    const row = {
      "תאריך": "15/03/2024",
      "פרטים": "note 1",
      "הערות": "note 2",
    };

    const normalized = normalizeRow(row);

    expect(normalized.notes).toContain("note 1");
    expect(normalized.notes).toContain("note 2");
  });
});

describe("getEffectiveDate", () => {
  it("prefers chargeDate", () => {
    const txn = {
      transactionDate: "2024-03-10",
      chargeDate: "2024-03-15",
      payee: "",
      outflow: 0,
      inflow: 0,
      originalAmount: null,
      notes: "",
      source: "",
    };

    expect(getEffectiveDate(txn)).toBe("2024-03-15");
  });

  it("falls back to transactionDate", () => {
    const txn = {
      transactionDate: "2024-03-10",
      chargeDate: "",
      payee: "",
      outflow: 0,
      inflow: 0,
      originalAmount: null,
      notes: "",
      source: "",
    };

    expect(getEffectiveDate(txn)).toBe("2024-03-10");
  });
});

describe("getEffectiveAmount", () => {
  it("returns negative for outflow", () => {
    const txn = {
      transactionDate: "",
      chargeDate: "",
      payee: "",
      outflow: 150,
      inflow: 0,
      originalAmount: null,
      notes: "",
      source: "",
    };

    expect(getEffectiveAmount(txn)).toBe(-150);
  });

  it("returns positive for inflow", () => {
    const txn = {
      transactionDate: "",
      chargeDate: "",
      payee: "",
      outflow: 0,
      inflow: 150,
      originalAmount: null,
      notes: "",
      source: "",
    };

    expect(getEffectiveAmount(txn)).toBe(150);
  });
});
