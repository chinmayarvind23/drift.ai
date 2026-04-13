import { describe, expect, it } from "vitest";
import { buildDemoDriftScan } from "../lib/drift-scan";
import { buildAccountSyncPayload, buildInterestLead } from "../lib/account-sync";

describe("buildAccountSyncPayload", () => {
  it("syncs summaries and decisions without raw transactions", () => {
    const payload = buildAccountSyncPayload({
      userId: "auth0|demo",
      scan: buildDemoDriftScan(),
      behaviorInsights: {
        Dining: {
          category: "Dining",
          answer: "I got a promotion and rewarded myself.",
          tag: "reward_spending",
          tagLabel: "Reward spending",
          summary: "Dining is tagged as reward spending.",
          createdAt: "2026-04-12T00:00:00.000Z",
          modelProvider: "huggingface",
          modelName: "hidden",
          confidence: 0.91
        }
      },
      interceptDecisions: [],
      projectionScenario: {
        years: 10,
        annualReturnRate: 0.07
      }
    });

    expect(payload.user_id).toBe("auth0|demo");
    expect(payload.scan_summary.monthlyOverspendCents).toBeGreaterThan(0);
    expect(payload.behavior_insights).toHaveProperty("Dining");
    expect(JSON.stringify(payload)).not.toMatch(/transactionDate|merchantName|sourceHash/);
  });
});

describe("buildInterestLead", () => {
  it("normalizes valid emails for report delivery or early access", () => {
    expect(buildInterestLead("  MAYA@EXAMPLE.COM ", "report")).toMatchObject({
      email: "maya@example.com",
      intent: "report"
    });
  });

  it("rejects invalid emails", () => {
    expect(() => buildInterestLead("not-an-email", "early_access")).toThrow(/valid email/i);
  });
});
