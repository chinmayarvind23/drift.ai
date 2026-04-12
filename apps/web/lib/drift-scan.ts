import {
  analyzeDrift,
  parseTransactionsCsv,
  projectCounterfactualWealth,
  type CategoryDrift,
  type DriftTransaction
} from "@drift/core";

type CategoryStateLabel = "Stable" | "Watch" | "High drift";

export interface DriftScanCategory {
  category: string;
  baselineLabel: string;
  recentLabel: string;
  monthlyOverspendLabel: string;
  driftPercentLabel: string;
  stateLabel: CategoryStateLabel;
  barPercent: number;
}

export interface DriftScan {
  score: number;
  scoreLabel: string;
  sourceLabel: string;
  transactionCount: number;
  monthlyOverspendCents: number;
  monthlyOverspendLabel: string;
  counterfactualCents: number;
  counterfactualLabel: string;
  projectionScenario: ProjectionScenario;
  projectionScenarioLabel: string;
  baselineWindowLabel: string;
  recentWindowLabel: string;
  topCategories: DriftScanCategory[];
  privacyItems: string[];
}

export interface ProjectionScenario {
  years: number;
  annualReturnRate: number;
}

const BASELINE_MONTHS = ["2025-07", "2025-08", "2025-09"];
const RECENT_MONTHS = ["2026-01", "2026-02", "2026-03"];

const CATEGORY_MONTHLY_SPEND_CENTS = [
  { category: "Dining", baseline: 12_000, recent: 40_000 },
  { category: "Shopping", baseline: 18_000, recent: 30_500 },
  { category: "Rides", baseline: 9_000, recent: 17_300 },
  { category: "Groceries", baseline: 42_000, recent: 42_000 }
] as const;

const DEFAULT_PROJECTION_SCENARIO: ProjectionScenario = {
  years: 10,
  annualReturnRate: 0.07
};

export function buildDemoDriftScan(
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO
): DriftScan {
  return buildDriftScan(buildSeedTransactions(), "Demo data", projectionScenario);
}

export function buildDriftScanFromCsv(
  csv: string,
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO
): DriftScan {
  return buildDriftScan(parseTransactionsCsv(csv), "Imported CSV", projectionScenario);
}

export function buildDriftScan(
  transactions: DriftTransaction[],
  sourceLabel: string,
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO
): DriftScan {
  const analysis = analyzeDrift(transactions, {
    baselineMonths: BASELINE_MONTHS.length,
    recentMonths: RECENT_MONTHS.length
  });
  const driftingCategories = analysis.categories.filter(
    (category) => category.monthlyOverspendCents > 0
  );
  const monthlyOverspendCents = driftingCategories.reduce(
    (total, category) => total + category.monthlyOverspendCents,
    0
  );
  const counterfactual = projectCounterfactualWealth({
    monthlyOverspendCents,
    years: projectionScenario.years,
    annualReturnRate: projectionScenario.annualReturnRate
  });

  return {
    score: analysis.driftScore,
    scoreLabel: String(analysis.driftScore),
    sourceLabel,
    transactionCount: transactions.length,
    monthlyOverspendCents,
    monthlyOverspendLabel: formatCurrency(monthlyOverspendCents),
    counterfactualCents: counterfactual.projectedValueCents,
    counterfactualLabel: formatCurrency(counterfactual.projectedValueCents),
    projectionScenario,
    projectionScenarioLabel: formatProjectionScenario(projectionScenario),
    baselineWindowLabel: formatMonthWindow(analysis.baselineMonths),
    recentWindowLabel: formatMonthWindow(analysis.recentMonths),
    topCategories: analysis.categories.map(toDriftScanCategory),
    privacyItems: [
      "Raw transactions stay local in this demo flow.",
      "Only category summaries feed the scan.",
      "Cloud backup is off until the user opts in."
    ]
  };
}

export function clampProjectionScenario(scenario: ProjectionScenario): ProjectionScenario {
  return {
    years: clampWholeNumber(scenario.years, 1, 40),
    annualReturnRate: clampDecimal(scenario.annualReturnRate, 0, 0.15)
  };
}

function buildSeedTransactions(): DriftTransaction[] {
  return CATEGORY_MONTHLY_SPEND_CENTS.flatMap(({ category, baseline, recent }) => [
    ...BASELINE_MONTHS.map((month) => buildTransaction(month, category, baseline)),
    ...RECENT_MONTHS.map((month) => buildTransaction(month, category, recent))
  ]);
}

function buildTransaction(
  month: string,
  category: string,
  amountCents: number
): DriftTransaction {
  const merchantName = `${category} sample`;
  const sourceHash = `${month}-${category}-${amountCents}`;

  return {
    id: sourceHash,
    transactionDate: `${month}-15`,
    merchantName,
    amountCents,
    category,
    sourceHash,
    source: "seed"
  };
}

function toDriftScanCategory(category: CategoryDrift): DriftScanCategory {
  return {
    category: category.category,
    baselineLabel: formatCurrency(category.baselineMonthlyCents),
    recentLabel: formatCurrency(category.recentMonthlyCents),
    monthlyOverspendLabel: formatCurrency(category.monthlyOverspendCents),
    driftPercentLabel: `${category.driftPercent}%`,
    stateLabel: formatState(category.driftState),
    barPercent: Math.min(100, Math.max(4, Math.round((category.driftPercent / 120) * 100)))
  };
}

function formatState(state: CategoryDrift["driftState"]): CategoryStateLabel {
  if (state === "high_drift") {
    return "High drift";
  }

  if (state === "watch") {
    return "Watch";
  }

  return "Stable";
}

function formatMonthWindow(months: string[]): string {
  const [startMonth] = months;
  const endMonth = months.at(-1);

  if (!startMonth || !endMonth) {
    return "Not enough data";
  }

  return `${formatMonth(startMonth)} - ${formatMonth(endMonth)}`;
}

function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function formatProjectionScenario(scenario: ProjectionScenario): string {
  const ratePercent = Number((scenario.annualReturnRate * 100).toFixed(1));

  return `${scenario.years} years at ${ratePercent}%`;
}

function clampWholeNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampDecimal(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}
