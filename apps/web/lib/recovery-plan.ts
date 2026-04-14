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
    return `Add a quick note for ${input.category}; then Drift can turn ${input.monthlyOverspendLabel}/month into a more useful next step.`;
  }

  if (input.tagLabel === "Reward spending") {
    return `Keep one planned ${input.category} reward, then move the extra repeat spend before the next week starts.`;
  }

  if (input.tagLabel === "Stress convenience") {
    return `Choose one easy ${input.category} fallback before the next busy stretch, so the default is ready before stress hits.`;
  }

  if (input.tagLabel === "Social pressure") {
    return `Pick your ${input.category} limit before plans are made, so the choice is already decided when the invite comes in.`;
  }

  if (input.tagLabel === "Habit creep") {
    return `Put one pause in front of ${input.category}, such as a weekly limit or one-day wait, to break the automatic loop.`;
  }

  if (input.tagLabel === "Life event") {
    return `Separate the necessary ${input.category} change from the part that can reset this month.`;
  }

  if (input.tagLabel === "Intentional upgrade") {
    return `Decide what amount of ${input.category} still feels worth it, then keep that choice visible before the next purchase.`;
  }

  return input.prompt;
}

function buildBehaviorRecovery(
  category: string,
  tag?: BehaviorTag
): { actionLabel: string; prompt: string; whyItHelps: string } {
  if (tag === "reward_spending") {
    return {
      actionLabel: "Keep the reward, cap the drift",
      prompt: `Choose one planned reward for ${category}, then redirect the rest before it becomes automatic.`,
      whyItHelps: "This lets you enjoy what matters while stopping extra purchases from becoming routine."
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
      actionLabel: "Keep or cap the upgrade",
      prompt: `Decide what amount of ${category} still feels worth it, then keep that choice visible before the next purchase.`,
      whyItHelps: "This separates a real upgrade from repeat spending you no longer care about."
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
