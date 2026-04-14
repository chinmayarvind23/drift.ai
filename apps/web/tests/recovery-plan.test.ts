import { describe, expect, it } from "vitest";
import { buildBehaviorInsight } from "../lib/behavior-insights";
import { buildDemoDriftScan } from "../lib/drift-scan";
import { buildRecoveryPlan } from "../lib/recovery-plan";

describe("buildRecoveryPlan", () => {
  it("turns the largest drift categories into a concrete monthly reset plan", () => {
    const plan = buildRecoveryPlan(buildDemoDriftScan(), {});

    expect(plan.monthlyTargetLabel).toBe("$289");
    expect(plan.annualTargetLabel).toBe("$3,472");
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0]).toMatchObject({
      category: "Dining",
      targetReductionLabel: "$167",
      actionLabel: "Reset 60% of this drift"
    });
  });

  it("keeps the plan empty when there is no positive drift", () => {
    const plan = buildRecoveryPlan({
      ...buildDemoDriftScan(),
      topCategories: []
    }, {});

    expect(plan.monthlyTargetCents).toBe(0);
    expect(plan.steps).toEqual([]);
  });

  it("changes recovery guidance when a behavior tag is saved", () => {
    const scan = buildDemoDriftScan();
    const plan = buildRecoveryPlan(scan, {
      Dining: buildBehaviorInsight(
        "Dining",
        "I got a new job and felt like I deserved nicer dinners.",
        "2026-04-12T10:00:00.000Z"
      ),
      Rides: buildBehaviorInsight(
        "Rides",
        "Work has been busy and I was too tired to plan ahead.",
        "2026-04-12T10:00:00.000Z"
      )
    });

    expect(plan.steps[0]).toMatchObject({
      category: "Dining",
      behaviorTagLabel: "Reward spending",
      actionLabel: "Keep the reward, cap the drift"
    });
    expect(plan.steps[0].prompt).toMatch(/planned reward/i);
    expect(plan.steps[0].aiRecoveryPath).toMatch(/Keep one planned Dining reward/i);
    expect(plan.steps[0].whyItHelps).toMatch(/enjoy what matters/i);
    expect(plan.steps.find((step) => step.category === "Rides")?.prompt).toMatch(/default fallback/i);
  });

  it("describes intentional upgrades without guilt or mistake language", () => {
    const scan = buildDemoDriftScan();
    const plan = buildRecoveryPlan(scan, {
      Dining: buildBehaviorInsight(
        "Dining",
        "This is an intentional upgrade after a promotion.",
        "2026-04-12T10:00:00.000Z",
        {
          tag: "intentional_upgrade",
          confidence: null,
          modelProvider: "deterministic",
          modelName: "test"
        }
      )
    });

    expect(plan.steps[0].behaviorTagLabel).toBe("Intentional upgrade");
    expect(plan.steps[0].prompt).toMatch(/decide what amount of Dining still feels worth it/i);
    expect(plan.steps[0].whyItHelps).not.toMatch(/mistake|guilt/i);
  });
});
