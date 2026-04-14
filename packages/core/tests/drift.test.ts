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
      recentMonths: 3,
      annualInflationRate: 0
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

  it("inflation-adjusts the old normal before calculating drift", () => {
    const transactions = months.flatMap((month, index) => [
      transaction(month, "Dining", index < 3 ? 10_000 : 11_000)
    ]);
    const noInflation = analyzeDrift(transactions, {
      baselineMonths: 3,
      recentMonths: 3,
      annualInflationRate: 0
    });
    const withInflation = analyzeDrift(transactions, {
      baselineMonths: 3,
      recentMonths: 3,
      annualInflationRate: 0.12
    });
    const noInflationDining = noInflation.categories[0];
    const withInflationDining = withInflation.categories[0];

    expect(withInflationDining).toBeDefined();
    expect(noInflationDining).toBeDefined();
    expect(withInflationDining?.baselineMonthlyCents).toBeGreaterThan(
      noInflationDining?.baselineMonthlyCents ?? 0
    );
    expect(withInflationDining?.monthlyOverspendCents).toBeLessThan(
      noInflationDining?.monthlyOverspendCents ?? 0
    );
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

  it("does not give the same score to small and large single-category overspend", () => {
    const smallDrift = analyzeDrift([
      transaction("2025-07", "Dining", 2_000),
      transaction("2025-08", "Dining", 2_000),
      transaction("2025-09", "Dining", 2_000),
      transaction("2026-01", "Dining", 6_000),
      transaction("2026-02", "Dining", 6_000),
      transaction("2026-03", "Dining", 6_000)
    ]);
    const largerDrift = analyzeDrift([
      transaction("2025-07", "Delivery", 2_000),
      transaction("2025-08", "Delivery", 2_000),
      transaction("2025-09", "Delivery", 2_000),
      transaction("2026-01", "Delivery", 20_000),
      transaction("2026-02", "Delivery", 20_000),
      transaction("2026-03", "Delivery", 20_000)
    ]);

    expect(smallDrift.driftScore).toBeLessThan(largerDrift.driftScore);
    expect(smallDrift.driftScore).toBeLessThan(85);
  });
});
