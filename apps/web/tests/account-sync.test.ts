import { describe, expect, it } from "vitest";
import { buildDemoDriftScan } from "../lib/drift-scan";
import {
  buildAccountProfile,
  buildAccountSyncPayload,
  buildInterestLead,
  canGenerateReport,
  restoreBehaviorInsights,
  restoreInterceptDecisions
} from "../lib/account-sync";

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

describe("buildAccountProfile", () => {
  it("maps Auth0 user claims into a Supabase profile", () => {
    expect(
      buildAccountProfile({
        sub: "auth0|abc",
        email: "maya@example.com",
        name: "Maya Chen",
        picture: "https://example.com/avatar.png"
      })
    ).toMatchObject({
      user_id: "auth0|abc",
      email: "maya@example.com",
      name: "Maya Chen"
    });
  });

  it("requires a signed-in account before report generation", () => {
    expect(canGenerateReport({ signedIn: false, hasAccount: false })).toBe(false);
    expect(canGenerateReport({ signedIn: true, hasAccount: true })).toBe(true);
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

describe("backup restore helpers", () => {
  it("rehydrates stored behavior summaries without exposing model internals", () => {
    const restored = restoreBehaviorInsights({
      Dining: {
        category: "Dining",
        answer: "I started a new job.",
        tag: "reward_spending",
        tagLabel: "Reward spending",
        summary: "Dining is tagged as reward spending.",
        createdAt: "2026-04-13T00:00:00.000Z",
        modelProvider: "huggingface"
      }
    });

    expect(restored.Dining).toMatchObject({
      category: "Dining",
      tagLabel: "Reward spending",
      modelName: "restored-backup",
      confidence: null
    });
  });

  it("rehydrates intercept decisions as summary-only decisions", () => {
    const restored = restoreInterceptDecisions([
      {
        id: "decision-1",
        category: "Dining",
        decision: "intentional",
        createdAt: "2026-04-13T00:00:00.000Z"
      }
    ]);

    expect(restored[0]).toMatchObject({
      id: "decision-1",
      merchantName: "Dining intercept",
      amountLabel: "$0",
      decision: "intentional"
    });
    expect(restored[0].nextMove).toMatch(/Import or sync transactions/);
  });
});
