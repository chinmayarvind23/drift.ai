export type BehaviorTag =
  | "reward_spending"
  | "stress_convenience"
  | "social_pressure"
  | "habit_creep"
  | "life_event"
  | "intentional_upgrade"
  | "unknown";

export interface BehaviorInsight {
  category: string;
  answer: string;
  followUpQuestion?: string;
  followUpAnswer?: string;
  tag: BehaviorTag;
  tagLabel: string;
  summary: string;
  createdAt: string;
  modelProvider: "ollama" | "deterministic";
  modelName: string;
  confidence: number | null;
}

export const BEHAVIOR_TAG_OPTIONS: Array<{ tag: Exclude<BehaviorTag, "unknown">; label: string }> = [
  { tag: "reward_spending", label: "Reward spending" },
  { tag: "stress_convenience", label: "Stress convenience" },
  { tag: "social_pressure", label: "Social pressure" },
  { tag: "habit_creep", label: "Habit creep" },
  { tag: "life_event", label: "Life event" },
  { tag: "intentional_upgrade", label: "Intentional upgrade" }
];

const TAG_LABELS: Record<BehaviorTag, string> = {
  reward_spending: "Reward spending",
  stress_convenience: "Stress convenience",
  social_pressure: "Social pressure",
  habit_creep: "Habit creep",
  life_event: "Life event",
  intentional_upgrade: "Intentional upgrade",
  unknown: "Needs review"
};

const TAG_KEYWORDS: Array<{ tag: BehaviorTag; keywords: string[] }> = [
  {
    tag: "reward_spending",
    keywords: ["deserve", "reward", "treat", "raise", "promotion", "new job", "bonus"]
  },
  {
    tag: "stress_convenience",
    keywords: ["stress", "busy", "tired", "burnout", "late", "convenience", "delivery"]
  },
  {
    tag: "social_pressure",
    keywords: ["friends", "coworker", "date", "dating", "social", "team", "going out"]
  },
  {
    tag: "life_event",
    keywords: ["moved", "move", "baby", "child", "commute", "school", "relationship"]
  },
  {
    tag: "intentional_upgrade",
    keywords: ["intentional", "planned", "worth it", "health", "therapy", "gym", "quality"]
  },
  {
    tag: "habit_creep",
    keywords: ["habit", "routine", "every day", "weekly", "normal", "automatic", "default"]
  }
];

export function buildBehaviorInsight(
  category: string,
  answer: string,
  createdAt = new Date().toISOString(),
  classification?: {
    tag: BehaviorTag;
    confidence: number | null;
    modelProvider: BehaviorInsight["modelProvider"];
    modelName: string;
    followUpQuestion?: string;
    followUpAnswer?: string;
  }
): BehaviorInsight {
  const trimmedAnswer = answer.trim();
  const tag = classification?.tag ?? classifyBehaviorAnswer(trimmedAnswer);

  return {
    category,
    answer: trimmedAnswer,
    followUpQuestion: classification?.followUpQuestion,
    followUpAnswer: classification?.followUpAnswer?.trim() || undefined,
    tag,
    tagLabel: TAG_LABELS[tag],
    summary: summarizeBehavior(category, trimmedAnswer, tag, classification?.followUpAnswer),
    createdAt,
    modelProvider: classification?.modelProvider ?? "deterministic",
    modelName: classification?.modelName ?? "keyword-fallback",
    confidence: classification?.confidence ?? null
  };
}

export function classifyBehaviorAnswer(answer: string): BehaviorTag {
  const normalizedAnswer = answer.toLowerCase();

  if (!normalizedAnswer.trim()) {
    return "unknown";
  }

  return (
    TAG_KEYWORDS.find(({ keywords }) =>
      keywords.some((keyword) => normalizedAnswer.includes(keyword))
    )?.tag ?? "unknown"
  );
}

function summarizeBehavior(
  category: string,
  answer: string,
  tag: BehaviorTag,
  followUpAnswer?: string
): string {
  if (tag === "unknown") {
    return `${category} needs a clearer behavior note before Drift can explain the pattern.`;
  }

  const followUp = followUpAnswer?.trim()
    ? ` You also added: "${followUpAnswer.trim()}"`
    : "";

  return `${category} is tagged as ${TAG_LABELS[tag].toLowerCase()} because you said: "${answer}"${followUp}`;
}

export function getBehaviorTagLabel(tag: BehaviorTag): string {
  return TAG_LABELS[tag];
}
