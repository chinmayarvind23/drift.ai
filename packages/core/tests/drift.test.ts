import { describe, expect, it } from "vitest";
import { analyzeDrift, type DriftTransaction } from "../src/index";

const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];

function transaction(month: string, category: string, amountCents: number): DriftTransaction {
  return {
    id: `${month}-${category}-${amountCents}`,
    transactionDate: `${month}-15`,
    merchantName: `${category} merchant`,
    amountCents,
    category,
    sourceHash: `${month}-${category}-${amountCents}`,
    source: "csv"
  };
}

describe("analyzeDrift", () => {
  it("finds categories that increased against an older baseline", () => {
    const transactions = months.flatMap((month, index) => [
      transaction(month, "Dining", index < 3 ? 10_000 : 22_000),
      transaction(month, "Groceries", 30_000)
    ]);

    const analysis = analyzeDrift(transactions, {
      baselineMonths: 3,
      recentMonths: 3
    });

    expect(analysis.driftScore).toBeGreaterThanOrEqual(70);
    expect(analysis.categories[0]).toMatchObject({
      category: "Dining",
      baselineMonthlyCents: 10_000,
      recentMonthlyCents: 22_000,
      monthlyOverspendCents: 12_000,
      driftPercent: 120,
      driftState: "high_drift"
    });
    expect(analysis.categories.find((category) => category.category === "Groceries")).toMatchObject({
      driftState: "stable",
      monthlyOverspendCents: 0
    });
  });

  it("ignores categories without spending in the baseline window", () => {
    const transactions = [
      transaction("2026-01", "Dining", 10_000),
      transaction("2026-02", "Dining", 10_000),
      transaction("2026-03", "Dining", 10_000),
      transaction("2026-04", "Travel", 50_000),
      transaction("2026-05", "Travel", 50_000),
      transaction("2026-06", "Travel", 50_000)
    ];

    const analysis = analyzeDrift(transactions);

    expect(analysis.categories.some((category) => category.category === "Travel")).toBe(false);
  });
});
