import { describe, expect, it } from "vitest";
import { parseTransactionsCsv } from "../src/index";

describe("parseTransactionsCsv", () => {
  it("normalizes the required Drift CSV fields", () => {
    const transactions = parseTransactionsCsv(`date,merchant,amount,category
2026-01-02,Cafe Alma,-18.42,Dining
2026-01-03,Target,42.10,Shopping`);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      transactionDate: "2026-01-02",
      merchantName: "Cafe Alma",
      amountCents: 1842,
      category: "Dining",
      direction: "expense",
      source: "csv"
    });
    expect(transactions[1]).toMatchObject({
      amountCents: 4210,
      direction: "income"
    });
    expect(transactions[0]?.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("deduplicates repeated rows by stable source hash", () => {
    const transactions = parseTransactionsCsv(`date,merchant,amount,category
2026-01-02,Cafe Alma,-18.42,Dining
2026-01-02,Cafe Alma,-18.42,Dining`);

    expect(transactions).toHaveLength(1);
  });

  it("rejects CSVs missing required headers", () => {
    expect(() =>
      parseTransactionsCsv(`date,description,amount
2026-01-02,Cafe Alma,-18.42`)
    ).toThrow(/missing required columns/i);
  });
});
