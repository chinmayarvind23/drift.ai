import { describe, expect, it } from "vitest";
import {
  buildDemoDriftScan,
  buildDriftScan,
  buildDriftScanFromCsv,
  type ProjectionScenario
} from "../lib/drift-scan";
import { getSyntheticUser, listSyntheticUsers } from "../lib/synthetic-users";

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

describe("synthetic users", () => {
  it("provides varied dummy users with enough transaction history to stress the scan", () => {
    const users = listSyntheticUsers();

    expect(users).toHaveLength(5);
    expect(users.every((user) => user.transactions.length >= 90)).toBe(true);
    expect(new Set(users.map((user) => user.scenario)).size).toBe(users.length);
  });

  it("runs synthetic users through the same drift scan pipeline", () => {
    const user = getSyntheticUser("nina-stress-convenience");

    expect(user).toBeDefined();

    const scan = buildDriftScan(user!.transactions, user!.name);

    expect(scan.transactionCount).toBeGreaterThanOrEqual(90);
    expect(scan.topCategories[0]).toMatchObject({
      category: "Delivery",
      stateLabel: "High drift"
    });
    expect(scan.monthlyOverspendCents).toBeGreaterThan(100_000);
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
