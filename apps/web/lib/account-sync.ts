import type { BehaviorInsight } from "./behavior-insights";
import type { DriftScan, ProjectionScenario } from "./drift-scan";
import type { InterceptDecision, InterceptDecisionState } from "./spend-intercept";

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

export type AccountBackupSnapshot = Omit<AccountSyncPayload, "user_id">;

type RestoredBehaviorInsight = Omit<BehaviorInsight, "modelName" | "confidence">;

type RestoredInterceptDecision = Pick<
  InterceptDecision,
  "id" | "category" | "decision" | "createdAt"
>;

export interface InterestLead {
  email: string;
  intent: LeadIntent;
  created_at: string;
}

export interface AccountStatus {
  signedIn: boolean;
  hasAccount: boolean;
}

export interface Auth0UserClaims {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AccountProfile {
  user_id: string;
  email: string | null;
  name: string | null;
  picture_url: string | null;
  updated_at: string;
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

export function buildAccountProfile(
  user: Auth0UserClaims,
  updatedAt = new Date().toISOString()
): AccountProfile {
  if (!user.sub) {
    throw new Error("Auth0 user is missing a subject identifier.");
  }

  return {
    user_id: user.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    picture_url: user.picture ?? null,
    updated_at: updatedAt
  };
}

export function canGenerateReport(status: AccountStatus): boolean {
  return status.signedIn && status.hasAccount;
}

export function restoreBehaviorInsights(
  insights: Record<string, RestoredBehaviorInsight>
): Record<string, BehaviorInsight> {
  return Object.fromEntries(
    Object.entries(insights).map(([category, insight]) => [
      category,
      {
        ...insight,
        modelName: "restored-backup",
        confidence: null
      }
    ])
  );
}

export function restoreInterceptDecisions(
  decisions: RestoredInterceptDecision[]
): InterceptDecision[] {
  return decisions.map((decision) => ({
    id: decision.id,
    merchantName: `${decision.category} intercept`,
    amountCents: 0,
    amountLabel: "$0",
    category: decision.category,
    driftPercentLabel: "Restored",
    monthlyOverspendLabel: "Restored",
    insightLabel: "Restored from backup",
    flagged: true,
    reason: `A ${decision.category} intercept decision was restored from account backup.`,
    ahaMessage: "This restored decision keeps the report consistent across devices.",
    nextMove: "Import or sync transactions on this device to review the original purchase.",
    createdAt: decision.createdAt,
    decision: decision.decision as InterceptDecisionState
  }));
}
