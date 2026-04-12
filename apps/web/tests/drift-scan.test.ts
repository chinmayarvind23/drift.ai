import { describe, expect, it } from "vitest";
import { buildDemoDriftScan } from "../lib/drift-scan";

describe("buildDemoDriftScan", () => {
  it("builds a dashboard-ready drift scan from seeded transactions", () => {
    const scan = buildDemoDriftScan();

    expect(scan.score).toBeGreaterThanOrEqual(70);
    expect(scan.monthlyOverspendLabel).toBe("$488");
    expect(scan.counterfactualLabel).toBe("$84,465");
    expect(scan.topCategories[0]).toMatchObject({
      category: "Dining",
      monthlyOverspendLabel: "$280",
      stateLabel: "High drift"
    });
    expect(scan.privacyItems).toContain("Raw transactions stay local in this demo flow.");
  });
});
