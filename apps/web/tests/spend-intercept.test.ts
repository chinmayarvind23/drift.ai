import { describe, expect, it } from "vitest";
import { buildDemoDriftScan } from "../lib/drift-scan";
import { buildBehaviorInsight } from "../lib/behavior-insights";
import { buildReportInterceptSummary, buildSpendIntercept, decideIntercept } from "../lib/spend-intercept";

describe("spend intercept", () => {
  it("flags a simulated transaction in a high-drift category", () => {
    const scan = buildDemoDriftScan();
    const intercept = buildSpendIntercept(
      scan,
      {
        merchantName: "Bar Luce",
        amountCents: 7200,
        category: "Dining"
      },
      {
        Dining: buildBehaviorInsight("Dining", "I felt like I deserved it.", "2026-04-12T10:00:00.000Z")
      },
      "2026-04-12T11:00:00.000Z"
    );

    expect(intercept.flagged).toBe(true);
    expect(intercept.insightLabel).toBe("Reward spending");
    expect(intercept.reason).toMatch(/intentionality check/i);
    expect(intercept.ahaMessage).toMatch(/not about the \$72/i);
    expect(intercept.nextMove).toMatch(/planned reward/i);
  });

  it("stores the user's intercept decision", () => {
    const scan = buildDemoDriftScan();
    const intercept = buildSpendIntercept(
      scan,
      {
        merchantName: "Market",
        amountCents: 4200,
        category: "Groceries"
      },
      {},
      "2026-04-12T11:00:00.000Z"
    );

    const decision = decideIntercept(intercept, "intentional");

    expect(decision.decision).toBe("intentional");
    expect(decision.category).toBe("Groceries");
  });

  it("summarizes saved intercept decisions without action-button language", () => {
    const intercept = buildSpendIntercept(
      buildDemoDriftScan(),
      {
        merchantName: "Bar Luce",
        amountCents: 7200,
        category: "Dining"
      },
      {}
    );
    const summary = buildReportInterceptSummary(decideIntercept(intercept, "intentional"));

    expect(summary.tagLabel).toBe("Intentional");
    expect(summary.summary).toMatch(/repeat Dining pattern/i);
    expect(summary.summary).not.toMatch(/mark .* intentional/i);
  });
});
