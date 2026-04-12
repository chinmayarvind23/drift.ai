import type { DriftScan } from "./drift-scan";

const RESET_RATIO = 0.6;
const MAX_STEPS = 3;

export interface RecoveryPlanStep {
  category: string;
  currentMonthlyLabel: string;
  oldNormalLabel: string;
  targetReductionCents: number;
  targetReductionLabel: string;
  actionLabel: string;
  prompt: string;
}

export interface RecoveryPlan {
  monthlyTargetCents: number;
  monthlyTargetLabel: string;
  annualTargetCents: number;
  annualTargetLabel: string;
  steps: RecoveryPlanStep[];
}

export function buildRecoveryPlan(scan: DriftScan): RecoveryPlan {
  const steps = scan.topCategories
    .filter((category) => category.monthlyOverspendCents > 0)
    .slice(0, MAX_STEPS)
    .map((category) => {
      const targetReductionCents = Math.round(category.monthlyOverspendCents * RESET_RATIO);

      return {
        category: category.category,
        currentMonthlyLabel: category.recentLabel,
        oldNormalLabel: category.baselineLabel,
        targetReductionCents,
        targetReductionLabel: formatCurrency(targetReductionCents),
        actionLabel: "Reset 60% of this drift",
        prompt: buildPrompt(category.category)
      };
    });
  const monthlyTargetCents = steps.reduce((total, step) => total + step.targetReductionCents, 0);

  return {
    monthlyTargetCents,
    monthlyTargetLabel: formatCurrency(monthlyTargetCents),
    annualTargetCents: monthlyTargetCents * 12,
    annualTargetLabel: formatCurrency(monthlyTargetCents * 12),
    steps
  };
}

function buildPrompt(category: string): string {
  return `Pick one repeatable rule for ${category} before the next statement closes.`;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
