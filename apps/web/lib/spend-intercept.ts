import type { DriftScan } from "./drift-scan";
import type { BehaviorInsight } from "./behavior-insights";

export type InterceptDecisionState = "intentional" | "dismissed";

export interface SimulatedTransaction {
  merchantName: string;
  amountCents: number;
  category: string;
}

export interface SpendIntercept {
  id: string;
  merchantName: string;
  amountCents: number;
  amountLabel: string;
  category: string;
  driftPercentLabel: string;
  monthlyOverspendLabel: string;
  insightLabel: string;
  flagged: boolean;
  reason: string;
  ahaMessage: string;
  nextMove: string;
  createdAt: string;
}

export interface InterceptDecision extends SpendIntercept {
  decision: InterceptDecisionState;
}

export interface ReportInterceptSummary {
  tagLabel: "Intentional" | "Dismissed";
  summary: string;
}

export function buildSpendIntercept(
  scan: DriftScan,
  transaction: SimulatedTransaction,
  insights: Record<string, BehaviorInsight>,
  createdAt = new Date().toISOString()
): SpendIntercept {
  const category = scan.topCategories.find(
    (item) => item.category.toLowerCase() === transaction.category.toLowerCase()
  );
  const insight = insights[transaction.category];
  const flagged = Boolean(category && category.monthlyOverspendCents > 0);
  const id = `${createdAt}-${transaction.category}-${transaction.merchantName}`;
  const amountLabel = formatCurrency(transaction.amountCents);

  return {
    id,
    merchantName: transaction.merchantName,
    amountCents: transaction.amountCents,
    amountLabel,
    category: transaction.category,
    driftPercentLabel: category?.driftPercentLabel ?? "0%",
    monthlyOverspendLabel: category?.monthlyOverspendLabel ?? "$0",
    insightLabel: insight?.tagLabel ?? "No behavior tag yet",
    flagged,
    reason: flagged
      ? `${transaction.category} is already above your old normal, so this purchase gets an intentionality check.`
      : `${transaction.category} is not a current drift pattern, so Drift would not interrupt this purchase.`
    ,
    ahaMessage: flagged
      ? `This is not about the ${amountLabel}. It is about whether ${transaction.category} keeps becoming your new normal.`
      : `This purchase does not match a current drift pattern.`,
    nextMove: buildNextMove(transaction.category, insight?.tagLabel),
    createdAt
  };
}

export function decideIntercept(
  intercept: SpendIntercept,
  decision: InterceptDecisionState
): InterceptDecision {
  return {
    ...intercept,
    decision
  };
}

export function buildReportInterceptSummary(decision: InterceptDecision): ReportInterceptSummary {
  const tagLabel = decision.decision === "intentional" ? "Intentional" : "Dismissed";
  const summary =
    decision.decision === "intentional"
      ? `${decision.merchantName} was treated as an intentional ${decision.category} purchase inside a repeat ${decision.category} pattern.`
      : `${decision.merchantName} was dismissed from the ${decision.category} intercept review.`;

  return {
    tagLabel,
    summary
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function buildNextMove(category: string, tagLabel?: string): string {
  if (tagLabel === "Reward spending") {
    return `If this is the planned reward, mark it intentional. If not, move it to the next planned reward slot.`;
  }

  if (tagLabel === "Stress convenience") {
    return `If stress is driving this, use the default fallback before buying.`;
  }

  if (tagLabel === "Social pressure") {
    return `If this came from an invite, choose the boundary before replying.`;
  }

  if (tagLabel === "Habit creep") {
    return `If this feels automatic, pause and use the weekly ${category} cap.`;
  }

  if (tagLabel === "Intentional upgrade") {
    return `If this is part of the accepted upgrade, mark it intentional and keep the cap visible.`;
  }

  return `Answer Pattern Lab for ${category} to make the intercept more personal.`;
}
