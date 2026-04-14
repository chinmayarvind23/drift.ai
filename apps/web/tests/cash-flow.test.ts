import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseTransactionsCsv } from "@drift/core";
import { buildCashFlowSummary } from "../lib/cash-flow";
import type { DriftTransaction } from "@drift/core";

function transaction(
  month: string,
  amountCents: number,
  category: string,
  direction: "income" | "expense"
): DriftTransaction {
  return {
    transactionDate: `${month}-15`,
    merchantName: category,
    amountCents,
    category,
    direction,
    sourceHash: `${month}-${category}-${direction}-${amountCents}`,
    source: "csv"
  };
}

describe("buildCashFlowSummary", () => {
  it("maps monthly income, spending, and category mix", () => {
    const summary = buildCashFlowSummary([
      transaction("2026-01", 500_000, "Paycheck", "income"),
      transaction("2026-01", 90_000, "Rent", "expense"),
      transaction("2026-01", 20_000, "Dining", "expense"),
      transaction("2026-02", 650_000, "Paycheck", "income"),
      transaction("2026-02", 90_000, "Rent", "expense"),
      transaction("2026-02", 80_000, "Dining", "expense")
    ]);

    expect(summary.months).toHaveLength(2);
    expect(summary.months[0]).toMatchObject({
      monthLabel: "Jan 2026",
      incomeLabel: "$5,000",
      spendLabel: "$1,100",
      netLabel: "$3,900"
    });
    expect(summary.incomeChangeLabel).toBe("+$1,500");
    expect(summary.spendChangeLabel).toBe("+$600");
    expect(summary.categoryMix[0]).toMatchObject({
      category: "Rent",
      amountLabel: "$1,800"
    });
  });

  it("handles expense-only demo data without inventing income", () => {
    const summary = buildCashFlowSummary([
      transaction("2026-01", 20_000, "Dining", "expense"),
      transaction("2026-02", 80_000, "Dining", "expense")
    ]);

    expect(summary.totalIncomeLabel).toBe("$0");
    expect(summary.months.every((month) => month.incomeCents === 0)).toBe(true);
  });

  it("maps the income and spending drift fixture", () => {
    const csv = readFileSync(
      new URL("./fixtures/income-spend-drift.csv", import.meta.url),
      "utf8"
    );
    const summary = buildCashFlowSummary(parseTransactionsCsv(csv));

    expect(summary.incomeChangeLabel).toBe("+$1,000");
    expect(summary.spendChangeLabel).toBe("+$160");
    expect(summary.months[0]).toMatchObject({
      incomeLabel: "$4,200",
      spendLabel: "$1,860",
      netLabel: "$2,340"
    });
    expect(summary.months.at(-1)).toMatchObject({
      incomeLabel: "$5,200",
      spendLabel: "$2,020",
      netLabel: "$3,180"
    });
  });
});
