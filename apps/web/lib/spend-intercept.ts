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
  createdAt: string;
}

export interface InterceptDecision extends SpendIntercept {
  decision: InterceptDecisionState;
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
  const flagged = Boolean(category && category.stateLabel !== "Stable");
  const id = `${createdAt}-${transaction.category}-${transaction.merchantName}`;

  return {
    id,
    merchantName: transaction.merchantName,
    amountCents: transaction.amountCents,
    amountLabel: formatCurrency(transaction.amountCents),
    category: transaction.category,
    driftPercentLabel: category?.driftPercentLabel ?? "0%",
    monthlyOverspendLabel: category?.monthlyOverspendLabel ?? "$0",
    insightLabel: insight?.tagLabel ?? "No behavior tag yet",
    flagged,
    reason: flagged
      ? `${transaction.category} is already above your old normal, so this purchase gets an intentionality check.`
      : `${transaction.category} is not a current drift pattern, so Drift would not interrupt this purchase.`
    ,
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

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
