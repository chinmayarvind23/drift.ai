import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildDemoDriftScan,
  buildDriftScan,
  buildDriftScanFromCsv,
  type ProjectionScenario
} from "../lib/drift-scan";

describe("buildDemoDriftScan", () => {
  it("builds a dashboard-ready drift scan from seeded transactions", () => {
    const scan = buildDemoDriftScan();

    expect(scan.score).toBeGreaterThanOrEqual(70);
    expect(scan.monthlyOverspendLabel).toBe("$488");
    expect("counterfactualLabel" in scan).toBe(false);
    expect("counterfactualCents" in scan).toBe(false);
    expect(scan.investmentGainLabel).toBe("$25,905");
    expect(scan.redirectedSavingsLabel).toBe("$58,560");
    expect(scan.topCategories[0]).toMatchObject({
      category: "Dining",
      monthlyOverspendLabel: "$280",
      stateLabel: "High drift"
    });
    expect(scan.privacyItems).toContain("Raw transactions stay local in this demo flow.");
  });

  it("customizes the saved-and-invested scenario per person", () => {
    const conservativeScenario: ProjectionScenario = {
      years: 5,
      annualReturnRate: 0.03
    };
    const ambitiousScenario: ProjectionScenario = {
      years: 20,
      annualReturnRate: 0.09
    };

    const conservativeScan = buildDemoDriftScan(conservativeScenario);
    const ambitiousScan = buildDemoDriftScan(ambitiousScenario);
    const zeroReturnScan = buildDemoDriftScan({
      years: 10,
      annualReturnRate: 0
    });

    expect(conservativeScan.projectionScenarioLabel).toBe("5 years at 3%");
    expect(ambitiousScan.projectionScenarioLabel).toBe("20 years at 9%");
    expect(ambitiousScan.investmentGainCents).toBeGreaterThan(conservativeScan.investmentGainCents);
    expect(zeroReturnScan.investmentGainCents).toBe(0);
    expect(zeroReturnScan.investmentGainLabel).toBe("$0");
  });
});

describe("buildDriftScanFromCsv", () => {
  it("uses a shorter old-normal and recent-normal window when Plaid history is short", () => {
    const scan = buildDriftScan(
      [
        {
          transactionDate: "2026-03-15",
          merchantName: "Bar Luce",
          amountCents: 4000,
          category: "Dining",
          sourceHash: "plaid-a",
          source: "plaid"
        },
        {
          transactionDate: "2026-04-15",
          merchantName: "Bar Luce",
          amountCents: 9000,
          category: "Dining",
          sourceHash: "plaid-b",
          source: "plaid"
        }
      ],
      "Plaid sandbox"
    );

    expect(scan.baselineWindowLabel).toBe("Mar 2026");
    expect(scan.recentWindowLabel).toBe("Apr 2026");
    expect(scan.monthlyOverspendLabel).toBe("$50");
    expect(scan.topCategories[0]).toMatchObject({
      category: "Dining",
      monthlyOverspendLabel: "$50"
    });
  });

  it("describes a valid scan with no category increases as contraction", () => {
    const scan = buildDriftScan(
      [
        {
          transactionDate: "2026-03-15",
          merchantName: "Bar Luce",
          amountCents: 9000,
          category: "Dining",
          sourceHash: "plaid-a",
          source: "plaid"
        },
        {
          transactionDate: "2026-04-15",
          merchantName: "Bar Luce",
          amountCents: 4000,
          category: "Dining",
          sourceHash: "plaid-b",
          source: "plaid"
        }
      ],
      "Plaid sandbox"
    );

    expect(scan.scanState).toBe("contraction");
    expect(scan.scanStateTitle).toBe("No overspending found");
    expect(scan.scanStateMessage).toMatch(/spending decreased/i);
    expect(scan.score).toBe(0);
  });

  it("makes a zero drift score read as a healthy result instead of a failed scan", () => {
    const scan = buildDriftScan(
      [
        {
          transactionDate: "2026-03-15",
          merchantName: "Market",
          amountCents: 5000,
          category: "Groceries",
          sourceHash: "plaid-a",
          source: "plaid"
        },
        {
          transactionDate: "2026-04-15",
          merchantName: "Market",
          amountCents: 5000,
          category: "Groceries",
          sourceHash: "plaid-b",
          source: "plaid"
        }
      ],
      "Plaid sandbox"
    );

    expect(scan.scanState).toBe("stable");
    expect(scan.scanStateTitle).toBe("Everything looks steady");
    expect(scan.scanStateMessage).toMatch(/close to your old normal/i);
    expect(scan.monthlyOverspendLabel).toBe("$0");
  });

  it("imports the healthy zero-drift CSV fixture for manual verification", () => {
    const csv = readFileSync(
      new URL("./fixtures/healthy-zero-drift.csv", import.meta.url),
      "utf8"
    );

    const scan = buildDriftScanFromCsv(csv);

    expect(scan.score).toBe(0);
    expect(scan.monthlyOverspendLabel).toBe("$0");
    expect(scan.investmentGainLabel).toBe("$0");
    expect(scan.scanStateTitle).toBe("Everything looks steady");
  });

  it("adapts the scan window to the uploaded transaction duration", () => {
    const scan = buildDriftScan(
      [
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
        "2026-03"
      ].map((month, index) => ({
        transactionDate: `${month}-15`,
        merchantName: "Bar Luce",
        amountCents: index < 4 ? 4000 : 9000,
        category: "Dining",
        sourceHash: `csv-${month}`,
        source: "csv" as const
      })),
      "Imported CSV"
    );

    expect(scan.baselineWindowLabel).toBe("Aug 2025 - Nov 2025");
    expect(scan.recentWindowLabel).toBe("Dec 2025 - Mar 2026");
    expect(scan.monthlyOverspendLabel).toBe("$50");
  });

  it("builds a drift scan from uploaded CSV text", () => {
    const scan = buildDriftScanFromCsv(`date,merchant,amount,category
2025-07-04,Bodega,-20,Dining
2025-08-04,Bodega,-20,Dining
2025-09-04,Bodega,-20,Dining
2026-01-04,Bar Luce,-60,Dining
2026-02-04,Bar Luce,-60,Dining
2026-03-04,Bar Luce,-60,Dining
2025-07-05,Market,-40,Groceries
2025-08-05,Market,-40,Groceries
2025-09-05,Market,-40,Groceries
2026-01-05,Market,-40,Groceries
2026-02-05,Market,-40,Groceries
2026-03-05,Market,-40,Groceries`);

    expect(scan.sourceLabel).toBe("Imported CSV");
    expect(scan.transactionCount).toBe(12);
    expect(scan.monthlyOverspendLabel).toBe("$40");
    expect(scan.topCategories[0]).toMatchObject({
      category: "Dining",
      monthlyOverspendLabel: "$40",
      stateLabel: "High drift"
    });
  });

  it("returns a helpful error for missing CSV columns", () => {
    expect(() => buildDriftScanFromCsv("date,description,amount\n2026-01-02,Cafe,-18")).toThrow(
      /missing required columns/i
    );
  });
});
