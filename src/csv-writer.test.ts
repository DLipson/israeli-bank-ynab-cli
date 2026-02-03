import { describe, it, expect } from "vitest";
import { toCSV } from "./csv-writer.js";
import type { YnabRow } from "./transformer.js";

describe("toCSV", () => {
  it("generates header row", () => {
    const csv = toCSV([]);
    expect(csv).toBe("Date,Payee,Memo,Outflow,Inflow");
  });

  it("converts rows to CSV format", () => {
    const rows: YnabRow[] = [
      {
        date: "2024-03-15",
        payee: "Test Store",
        memo: "",
        outflow: "100.00",
        inflow: "",
      },
    ];
    const csv = toCSV(rows);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("2024-03-15,Test Store,,100.00,");
  });

  it("escapes values with commas", () => {
    const rows: YnabRow[] = [
      {
        date: "2024-03-15",
        payee: "Store, Inc.",
        memo: "",
        outflow: "100.00",
        inflow: "",
      },
    ];
    const csv = toCSV(rows);
    expect(csv).toContain('"Store, Inc."');
  });

  it("escapes values with quotes", () => {
    const rows: YnabRow[] = [
      {
        date: "2024-03-15",
        payee: 'The "Best" Store',
        memo: "",
        outflow: "100.00",
        inflow: "",
      },
    ];
    const csv = toCSV(rows);
    expect(csv).toContain('"The ""Best"" Store"');
  });

  it("escapes values with newlines", () => {
    const rows: YnabRow[] = [
      {
        date: "2024-03-15",
        payee: "Line1\nLine2",
        memo: "",
        outflow: "100.00",
        inflow: "",
      },
    ];
    const csv = toCSV(rows);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it("handles JSON memo field", () => {
    const rows: YnabRow[] = [
      {
        date: "2024-03-15",
        payee: "Test",
        memo: '{"source":"Max - 1234"}',
        outflow: "100.00",
        inflow: "",
      },
    ];
    const csv = toCSV(rows);
    // JSON has quotes, so memo should be escaped
    expect(csv).toContain('"{""source"":""Max - 1234""}"');
  });

  it("handles multiple rows", () => {
    const rows: YnabRow[] = [
      { date: "2024-03-15", payee: "Store A", memo: "", outflow: "100.00", inflow: "" },
      { date: "2024-03-16", payee: "Store B", memo: "", outflow: "", inflow: "50.00" },
    ];
    const csv = toCSV(rows);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3);
  });

  it("handles Hebrew characters", () => {
    const rows: YnabRow[] = [
      {
        date: "2024-03-15",
        payee: "סופר פארם",
        memo: "",
        outflow: "150.00",
        inflow: "",
      },
    ];
    const csv = toCSV(rows);
    expect(csv).toContain("סופר פארם");
  });
});
