export const FINANCIAL_TEXT_MODEL_ID =
  "mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis";

type FinancialClassifierResult = Array<{ label: string; score: number }>;
type FinancialTextClassifier = (text: string) => Promise<FinancialClassifierResult>;

export interface FinancialReportInput {
  executiveSummary: string;
  monthlyOverspendLabel: string;
  topPatternCount: number;
}

export interface FinancialReportInsight {
  label: "Financial pressure" | "Watchlist" | "Steady";
  summary: string;
  modelProvider: "huggingface" | "deterministic";
  modelName: string;
}

let financialClassifierPromise: Promise<FinancialTextClassifier> | null = null;

export async function buildFinancialReportInsight(
  input: FinancialReportInput,
  classifierLoader = getFinancialTextClassifier
): Promise<FinancialReportInsight> {
  try {
    const classifier = await classifierLoader();
    const result = await classifier(
      `${input.executiveSummary} Monthly overspend is ${input.monthlyOverspendLabel}.`
    );
    const topLabel = result[0]?.label.toLowerCase() ?? "";

    return {
      label: mapFinancialLabel(topLabel, input.topPatternCount),
      summary: buildFinancialSummary(input),
      modelProvider: "huggingface",
      modelName: FINANCIAL_TEXT_MODEL_ID
    };
  } catch {
    return {
      label: input.topPatternCount > 0 ? "Watchlist" : "Steady",
      summary: buildFinancialSummary(input),
      modelProvider: "deterministic",
      modelName: "local-report-rules"
    };
  }
}

export function describeFinancialReportModel(insight: FinancialReportInsight): string {
  if (insight.modelProvider === "huggingface") {
    return "Local financial text analysis reviewed this report summary.";
  }

  return "Local report rules reviewed this scan summary.";
}

async function getFinancialTextClassifier(): Promise<FinancialTextClassifier> {
  const injectedClassifier = getInjectedFinancialClassifier();

  if (injectedClassifier) {
    return injectedClassifier;
  }

  if (!financialClassifierPromise) {
    financialClassifierPromise = loadFinancialTextClassifier();
  }

  return financialClassifierPromise;
}

async function loadFinancialTextClassifier(): Promise<FinancialTextClassifier> {
  const { env, pipeline } = await import("@huggingface/transformers");

  env.allowRemoteModels = true;
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  return pipeline("text-classification", FINANCIAL_TEXT_MODEL_ID, { dtype: "q8" }) as Promise<FinancialTextClassifier>;
}

function mapFinancialLabel(label: string, topPatternCount: number): FinancialReportInsight["label"] {
  if (topPatternCount === 0) {
    return "Steady";
  }

  if (label.includes("negative")) {
    return "Financial pressure";
  }

  return "Watchlist";
}

function buildFinancialSummary(input: FinancialReportInput): string {
  if (input.topPatternCount === 0) {
    return "The scan found no repeated overspending. Keep watching new patterns, but there is no recovery target yet.";
  }

  return `The report found repeated monthly pressure of ${input.monthlyOverspendLabel}. The recovery plan should focus on the repeat pattern, not one-off purchases.`;
}

function getInjectedFinancialClassifier(): FinancialTextClassifier | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (window as Window & { __DRIFT_FINANCIAL_CLASSIFIER__?: FinancialTextClassifier })
    .__DRIFT_FINANCIAL_CLASSIFIER__ ?? null;
}
