import { describe, expect, it } from "vitest";
import { projectCounterfactualWealth } from "../src/index";

describe("projectCounterfactualWealth", () => {
  it("projects monthly drift as recurring invested contributions", () => {
    const projection = projectCounterfactualWealth({
      monthlyOverspendCents: 18_000,
      years: 10,
      annualReturnRate: 0.07
    });

    expect(projection.principalCents).toBe(2_160_000);
    expect(projection.projectedValueCents).toBeGreaterThan(3_000_000);
    expect(projection.projectedGainCents).toBe(
      projection.projectedValueCents - projection.principalCents
    );
  });

  it("returns zero for zero drift", () => {
    expect(
      projectCounterfactualWealth({
        monthlyOverspendCents: 0,
        years: 10,
        annualReturnRate: 0.07
      })
    ).toMatchObject({
      principalCents: 0,
      projectedValueCents: 0,
      projectedGainCents: 0
    });
  });

  it("separates saved principal from investment gain at zero return", () => {
    expect(
      projectCounterfactualWealth({
        monthlyOverspendCents: 48_800,
        years: 10,
        annualReturnRate: 0
      })
    ).toMatchObject({
      principalCents: 5_856_000,
      projectedValueCents: 5_856_000,
      projectedGainCents: 0
    });
  });
});
