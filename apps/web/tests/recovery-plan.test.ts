import { describe, expect, it } from "vitest";
import { buildDemoDriftScan } from "../lib/drift-scan";
import { buildRecoveryPlan } from "../lib/recovery-plan";

describe("buildRecoveryPlan", () => {
  it("turns the largest drift categories into a concrete monthly reset plan", () => {
    const plan = buildRecoveryPlan(buildDemoDriftScan());

    expect(plan.monthlyTargetLabel).toBe("$293");
    expect(plan.annualTargetLabel).toBe("$3,514");
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]).toMatchObject({
      category: "Dining",
      targetReductionLabel: "$168",
      actionLabel: "Reset 60% of this drift"
    });
  });

  it("keeps the plan empty when there is no positive drift", () => {
    const plan = buildRecoveryPlan({
      ...buildDemoDriftScan(),
      topCategories: []
    });

    expect(plan.monthlyTargetCents).toBe(0);
    expect(plan.steps).toEqual([]);
  });
});
