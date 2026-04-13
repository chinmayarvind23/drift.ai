import type { BehaviorInsight } from "./behavior-insights";
import type { DriftScan, ProjectionScenario } from "./drift-scan";
import type { InterceptDecision } from "./spend-intercept";

export type LeadIntent = "report" | "early_access";

export interface AccountSyncInput {
  userId: string;
  scan: DriftScan;
  behaviorInsights: Record<string, BehaviorInsight>;
  interceptDecisions: InterceptDecision[];
  projectionScenario: ProjectionScenario;
}

export interface AccountSyncPayload {
  user_id: string;
  scan_summary: {
    score: number;
    monthlyOverspendCents: number;
    investmentGainCents: number;
    redirectedSavingsCents: number;
    topCategories: Array<{
      category: string;
      monthlyOverspendCents: number;
      baselineMonthlyCents: number;
      recentMonthlyCents: number;
      stateLabel: string;
    }>;
    newPatterns: Array<{
      category: string;
      recentMonthlyCents: number;
    }>;
  };
  behavior_insights: Record<string, Omit<BehaviorInsight, "modelName" | "confidence">>;
  intercept_decisions: Array<Pick<InterceptDecision, "id" | "category" | "decision" | "createdAt">>;
  projection_scenario: ProjectionScenario;
}

export interface InterestLead {
  email: string;
  intent: LeadIntent;
  created_at: string;
}

export function buildAccountSyncPayload(input: AccountSyncInput): AccountSyncPayload {
  return {
    user_id: input.userId,
    scan_summary: {
      score: input.scan.score,
      monthlyOverspendCents: input.scan.monthlyOverspendCents,
      investmentGainCents: input.scan.investmentGainCents,
      redirectedSavingsCents: input.scan.redirectedSavingsCents,
      topCategories: input.scan.topCategories.map((category) => ({
        category: category.category,
        monthlyOverspendCents: category.monthlyOverspendCents,
        baselineMonthlyCents: category.baselineMonthlyCents,
        recentMonthlyCents: category.recentMonthlyCents,
        stateLabel: category.stateLabel
      })),
      newPatterns: input.scan.newPatterns.map((pattern) => ({
        category: pattern.category,
        recentMonthlyCents: pattern.recentMonthlyCents
      }))
    },
    behavior_insights: Object.fromEntries(
      Object.entries(input.behaviorInsights).map(([category, insight]) => [
        category,
        {
          category: insight.category,
          answer: insight.answer,
          tag: insight.tag,
          tagLabel: insight.tagLabel,
          summary: insight.summary,
          createdAt: insight.createdAt,
          modelProvider: insight.modelProvider
        }
      ])
    ),
    intercept_decisions: input.interceptDecisions.map((decision) => ({
      id: decision.id,
      category: decision.category,
      decision: decision.decision,
      createdAt: decision.createdAt
    })),
    projection_scenario: input.projectionScenario
  };
}

export function buildInterestLead(
  email: string,
  intent: LeadIntent,
  createdAt = new Date().toISOString()
): InterestLead {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  return {
    email: normalizedEmail,
    intent,
    created_at: createdAt
  };
}
