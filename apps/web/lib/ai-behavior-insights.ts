import {
  buildBehaviorInsight,
  classifyBehaviorAnswer,
  getBehaviorTagLabel,
  type BehaviorInsight,
  type BehaviorTag
} from "./behavior-insights";

export type BehaviorTaggerResult = {
  tag: BehaviorTag;
  provider: BehaviorInsight["modelProvider"];
  followUpQuestion?: string;
};

type BehaviorTagger = (category: string, answer: string) => Promise<BehaviorTaggerResult>;

export async function buildAiBehaviorInsight(
  category: string,
  answer: string,
  createdAt = new Date().toISOString(),
  tagger: BehaviorTagger = getOllamaBehaviorTag
): Promise<BehaviorInsight> {
  const trimmedAnswer = answer.trim();

  if (!trimmedAnswer) {
    return buildBehaviorInsight(category, trimmedAnswer, createdAt);
  }

  try {
    const result = await tagger(category, trimmedAnswer);

    return buildBehaviorInsight(category, trimmedAnswer, createdAt, {
      tag: result.tag,
      confidence: null,
      modelProvider: result.provider,
      modelName: result.provider === "ollama" ? "qwen-local" : "keyword-fallback",
      followUpQuestion: result.followUpQuestion ?? buildLocalFollowUpQuestion(category, result.tag)
    });
  } catch {
    return buildBehaviorInsight(category, trimmedAnswer, createdAt, {
      tag: classifyBehaviorAnswer(trimmedAnswer),
      confidence: null,
      modelProvider: "deterministic",
      modelName: "keyword-fallback"
    });
  }
}

function buildLocalFollowUpQuestion(category: string, tag: BehaviorTag): string {
  if (tag === "reward_spending") {
    return `For ${category}, what would count as one intentional reward versus an automatic repeat?`;
  }

  if (tag === "stress_convenience") {
    return `For ${category}, what stressful moment or convenience trigger made this the default?`;
  }

  if (tag === "social_pressure") {
    return `For ${category}, whose plans or expectations made this harder to say no to?`;
  }

  if (tag === "habit_creep") {
    return `For ${category}, when did this start feeling automatic instead of chosen?`;
  }

  if (tag === "intentional_upgrade") {
    return `For ${category}, what part of this upgrade is worth keeping on purpose?`;
  }

  if (tag === "life_event") {
    return `For ${category}, which part of this life change is temporary and which part is permanent?`;
  }

  return `What specifically changed around ${category}: stress, reward, social plans, habit, or a life event?`;
}

export function describeInsightModel(insight: BehaviorInsight): string {
  if (insight.modelProvider === "ollama") {
    return `Local AI suggested ${getBehaviorTagLabel(insight.tag).toLowerCase()}. You can edit it before saving.`;
  }

  return `Local rules suggested ${getBehaviorTagLabel(insight.tag).toLowerCase()}. Start Ollama for AI tagging, or edit the tag before saving.`;
}

async function getOllamaBehaviorTag(category: string, answer: string): Promise<BehaviorTaggerResult> {
  const injectedTagger = getInjectedBehaviorTagger();

  if (injectedTagger) {
    return injectedTagger(category, answer);
  }

  const response = await fetch("/api/ai/behavior", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, answer })
  });

  if (!response.ok) {
    throw new Error("Local behavior AI is unavailable.");
  }

  const body = await response.json() as {
    tag?: BehaviorTag;
    provider?: BehaviorInsight["modelProvider"];
    followUpQuestion?: string;
  };

  if (!body.tag) {
    throw new Error("Local behavior AI returned no tag.");
  }

  return {
    tag: body.tag,
    provider: body.provider ?? "ollama",
    followUpQuestion: body.followUpQuestion
  };
}

function getInjectedBehaviorTagger(): BehaviorTagger | null {
  if (typeof window === "undefined") {
    return null;
  }

  const windowWithTaggers = window as Window & {
    __DRIFT_AI_TAGGER__?: BehaviorTagger;
    __DRIFT_AI_CLASSIFIER__?: () => Promise<{ labels: string[]; scores: number[] }>;
  };

  if (windowWithTaggers.__DRIFT_AI_TAGGER__) {
    return windowWithTaggers.__DRIFT_AI_TAGGER__;
  }

  if (windowWithTaggers.__DRIFT_AI_CLASSIFIER__) {
    return async () => {
      const result = await windowWithTaggers.__DRIFT_AI_CLASSIFIER__?.();
      const label = result?.labels[0]?.toLowerCase().replace(/\s+/g, "_") as BehaviorTag | undefined;

      return {
        tag: label ?? "unknown",
        provider: "ollama"
      };
    };
  }

  return null;
}
