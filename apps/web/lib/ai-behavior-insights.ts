import {
  buildBehaviorInsight,
  classifyBehaviorAnswer,
  getBehaviorTagLabel,
  type BehaviorInsight,
  type BehaviorTag
} from "./behavior-insights";

export const BEHAVIOR_MODEL_ID = "Xenova/distilbert-base-uncased-mnli";
const BEHAVIOR_MODEL_FALLBACK_ID = "Xenova/mobilebert-uncased-mnli";

type CandidateLabel =
  | "reward spending"
  | "stress convenience"
  | "social pressure"
  | "habit creep"
  | "life event"
  | "intentional upgrade";

type ZeroShotResult = {
  labels: string[];
  scores: number[];
};

type ZeroShotClassifier = (
  text: string,
  candidateLabels: string[],
  options?: { hypothesis_template?: string; multi_label?: boolean }
) => Promise<ZeroShotResult>;

const CANDIDATE_TAGS: Record<CandidateLabel, BehaviorTag> = {
  "reward spending": "reward_spending",
  "stress convenience": "stress_convenience",
  "social pressure": "social_pressure",
  "habit creep": "habit_creep",
  "life event": "life_event",
  "intentional upgrade": "intentional_upgrade"
};

const CANDIDATE_LABELS = Object.keys(CANDIDATE_TAGS) as CandidateLabel[];
let classifierPromise: Promise<ZeroShotClassifier> | null = null;

export async function buildAiBehaviorInsight(
  category: string,
  answer: string,
  createdAt = new Date().toISOString(),
  classifierLoader = getHuggingFaceBehaviorClassifier
): Promise<BehaviorInsight> {
  const trimmedAnswer = answer.trim();

  if (!trimmedAnswer) {
    return buildBehaviorInsight(category, trimmedAnswer, createdAt);
  }

  try {
    const classifier = await classifierLoader();
    const result = await classifier(
      trimmedAnswer,
      [...CANDIDATE_LABELS],
      {
        hypothesis_template: "This spending explanation is about {}.",
        multi_label: false
      }
    );
    const label = result.labels[0]?.toLowerCase() as CandidateLabel | undefined;
    const confidence = result.scores[0] ?? 0;
    const aiTag = label ? CANDIDATE_TAGS[label] : undefined;
    const fallbackTag = classifyBehaviorAnswer(trimmedAnswer);
    const tag = aiTag ?? fallbackTag;

    return buildBehaviorInsight(category, trimmedAnswer, createdAt, {
      tag,
      confidence,
      modelProvider: "huggingface",
      modelName: BEHAVIOR_MODEL_ID
    });
  } catch {
    const tag = classifyBehaviorAnswer(trimmedAnswer);

    return buildBehaviorInsight(category, trimmedAnswer, createdAt, {
      tag,
      confidence: null,
      modelProvider: "deterministic",
      modelName: "keyword-fallback"
    });
  }
}

export function describeInsightModel(insight: BehaviorInsight): string {
  if (insight.modelProvider === "huggingface") {
    return `AI suggested ${getBehaviorTagLabel(insight.tag).toLowerCase()}. You can edit it before saving.`;
  }

  return "Insight saved locally. Add a little more detail if the tag needs refinement.";
}

async function getHuggingFaceBehaviorClassifier(): Promise<ZeroShotClassifier> {
  const injectedClassifier = getInjectedClassifier();

  if (injectedClassifier) {
    return injectedClassifier;
  }

  if (!classifierPromise) {
    classifierPromise = loadHuggingFaceBehaviorClassifier();
  }

  return classifierPromise;
}

async function loadHuggingFaceBehaviorClassifier(): Promise<ZeroShotClassifier> {
  const { env, pipeline } = await import("@huggingface/transformers");

  env.allowRemoteModels = true;
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  return loadFirstAvailableClassifier(pipeline as (
    task: "zero-shot-classification",
    model: string,
    options: { dtype: "q8" }
  ) => Promise<ZeroShotClassifier>);
}

async function loadFirstAvailableClassifier(
  pipeline: (
    task: "zero-shot-classification",
    model: string,
    options: { dtype: "q8" }
  ) => Promise<ZeroShotClassifier>
): Promise<ZeroShotClassifier> {
  let lastError: unknown;

  for (const modelId of [BEHAVIOR_MODEL_ID, BEHAVIOR_MODEL_FALLBACK_ID]) {
    try {
      return await retry(() => pipeline("zero-shot-classification", modelId, { dtype: "q8" }));
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Could not load a local AI classifier.");
}

async function retry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Operation failed.");
}

function getInjectedClassifier(): ZeroShotClassifier | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { __DRIFT_AI_CLASSIFIER__?: ZeroShotClassifier })
    .__DRIFT_AI_CLASSIFIER__ ?? null;
}
