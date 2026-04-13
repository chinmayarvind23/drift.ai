import type { DriftScan } from "./drift-scan";
import type { BehaviorInsight, BehaviorTag } from "./behavior-insights";

const RESET_RATIO = 0.6;
const MAX_STEPS = 3;

export interface RecoveryPlanStep {
  category: string;
  currentMonthlyLabel: string;
  oldNormalLabel: string;
  targetReductionCents: number;
  targetReductionLabel: string;
  actionLabel: string;
  behaviorTagLabel: string;
  prompt: string;
  whyItHelps: string;
  aiRecoveryPath: string;
}

export interface RecoveryPlan {
  monthlyTargetCents: number;
  monthlyTargetLabel: string;
  annualTargetCents: number;
  annualTargetLabel: string;
  steps: RecoveryPlanStep[];
}

export function buildRecoveryPlan(
  scan: DriftScan,
  insights: Record<string, BehaviorInsight> = {}
): RecoveryPlan {
  const steps = scan.topCategories
    .filter((category) => category.monthlyOverspendCents > 0)
    .slice(0, MAX_STEPS)
    .map((category) => {
      const targetReductionCents = Math.round(category.monthlyOverspendCents * RESET_RATIO);
      const insight = insights[category.category];
      const recovery = buildBehaviorRecovery(category.category, insight?.tag);
      const aiRecoveryPath = writeRecoveryPath({
        category: category.category,
        monthlyOverspendLabel: category.monthlyOverspendLabel,
        tagLabel: insight?.tagLabel,
        answer: insight?.answer,
        prompt: recovery.prompt
      });

      return {
        category: category.category,
        currentMonthlyLabel: category.recentLabel,
        oldNormalLabel: category.baselineLabel,
        targetReductionCents,
        targetReductionLabel: formatCurrency(targetReductionCents),
        actionLabel: recovery.actionLabel,
        behaviorTagLabel: insight?.tagLabel ?? "No behavior note yet",
        prompt: recovery.prompt,
        whyItHelps: recovery.whyItHelps,
        aiRecoveryPath
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

function writeRecoveryPath(input: {
  category: string;
  monthlyOverspendLabel: string;
  tagLabel?: string;
  answer?: string;
  prompt: string;
}): string {
  if (!input.tagLabel || !input.answer) {
    return `Add behavior context for ${input.category}; then Drift can turn ${input.monthlyOverspendLabel}/month into a personal reset path.`;
  }

  return `Because this looks like ${input.tagLabel.toLowerCase()}, protect the useful part of the pattern and reset the repeat spend: ${input.prompt}`;
}

function buildBehaviorRecovery(
  category: string,
  tag?: BehaviorTag
): { actionLabel: string; prompt: string; whyItHelps: string } {
  if (tag === "reward_spending") {
    return {
      actionLabel: "Keep the reward, cap the drift",
      prompt: `Choose one planned reward for ${category}, then redirect the rest before it becomes automatic.`,
      whyItHelps: "This protects the emotional win without letting every purchase become the new baseline."
    };
  }

  if (tag === "stress_convenience") {
    return {
      actionLabel: "Build a default fallback",
      prompt: `Set one low-effort default fallback for ${category} before the next busy week hits.`,
      whyItHelps: "This removes the decision point when stress is highest."
    };
  }

  if (tag === "social_pressure") {
    return {
      actionLabel: "Pre-commit before plans",
      prompt: `Pick the ${category} boundary before the invite arrives, not while everyone is deciding.`,
      whyItHelps: "This lowers the pressure of making the cheaper choice in public."
    };
  }

  if (tag === "habit_creep") {
    return {
      actionLabel: "Break the automatic loop",
      prompt: `Add one speed bump to ${category}: a weekly cap, merchant pause, or one-day waiting rule.`,
      whyItHelps: "This targets the routine, not your willpower."
    };
  }

  if (tag === "life_event") {
    return {
      actionLabel: "Separate temporary from permanent",
      prompt: `Mark which part of ${category} belongs to the life change and which part can reset this month.`,
      whyItHelps: "This avoids fighting necessary spending while still catching drift."
    };
  }

  if (tag === "intentional_upgrade") {
    return {
      actionLabel: "Accept or cap the upgrade",
      prompt: `Decide whether ${category} is an accepted upgrade. If yes, cap it and remove it from guilt spending.`,
      whyItHelps: "This keeps intentional spending from being treated like a mistake."
    };
  }

  return {
    actionLabel: "Reset 60% of this drift",
    prompt: `Add a Pattern Lab note for ${category}, then pick one repeatable rule before the next statement closes.`,
    whyItHelps: "The rule gets sharper after Drift knows why the pattern started."
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
