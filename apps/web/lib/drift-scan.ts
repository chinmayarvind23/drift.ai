import {
  analyzeDrift,
  parseTransactionsCsv,
  projectCounterfactualWealth,
  type CategoryDrift,
  type DriftTransaction
} from "@drift/core";
import {
  formatInflationRateLabel,
  getDefaultInflationRate,
  type InflationRateSnapshot
} from "./inflation-rate";

type CategoryStateLabel = "Stable" | "Watch" | "High drift" | "No longer active";
type ScanState = "not_enough_data" | "contraction" | "stable" | "drift_detected";

export interface DriftScanCategory {
  category: string;
  baselineMonthlyCents: number;
  recentMonthlyCents: number;
  monthlyOverspendCents: number;
  baselineLabel: string;
  recentLabel: string;
  monthlyOverspendLabel: string;
  driftPercentLabel: string;
  stateLabel: CategoryStateLabel;
  barPercent: number;
}

export interface NewPattern {
  category: string;
  recentMonthlyCents: number;
  recentMonthlyLabel: string;
  recentWindowLabel: string;
  reviewLabel: "New pattern, not Drift";
}

export interface DriftScan {
  score: number;
  scoreLabel: string;
  sourceLabel: string;
  transactionCount: number;
  monthlyOverspendCents: number;
  monthlyOverspendLabel: string;
  investmentGainCents: number;
  investmentGainLabel: string;
  redirectedSavingsCents: number;
  redirectedSavingsLabel: string;
  annualInflationRate: number;
  inflationRateLabel: string;
  inflationSourceLabel: string;
  projectionScenario: ProjectionScenario;
  projectionScenarioLabel: string;
  baselineWindowLabel: string;
  recentWindowLabel: string;
  scanState: ScanState;
  scanStateTitle: string;
  scanStateMessage: string;
  topCategories: DriftScanCategory[];
  newPatterns: NewPattern[];
  privacyItems: string[];
}

export interface ProjectionScenario {
  years: number;
  annualReturnRate: number;
}

export interface BackupScanSummary {
  score: number;
  monthlyOverspendCents: number;
  investmentGainCents: number;
  redirectedSavingsCents: number;
  topCategories: Array<{
    category: string;
    monthlyOverspendCents: number;
    baselineMonthlyCents: number;
    recentMonthlyCents: number;
    stateLabel: string;
  }>;
  newPatterns: Array<{
    category: string;
    recentMonthlyCents: number;
  }>;
}

const BASELINE_MONTHS = ["2025-07", "2025-08", "2025-09"];
const RECENT_MONTHS = ["2026-01", "2026-02", "2026-03"];
const DEFAULT_WINDOW_MONTHS = 3;

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
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO,
  inflationRate: InflationRateSnapshot = getDefaultInflationRate()
): DriftScan {
  return buildDriftScan(buildSeedTransactions(), "Demo data", projectionScenario, inflationRate);
}

export function buildEmptyDriftScan(
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO,
  inflationRate: InflationRateSnapshot = getDefaultInflationRate()
): DriftScan {
  return buildDriftScan([], "No data yet", projectionScenario, inflationRate);
}

export function buildDriftScanFromCsv(
  csv: string,
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO,
  inflationRate: InflationRateSnapshot = getDefaultInflationRate()
): DriftScan {
  return buildDriftScan(parseTransactionsCsv(csv), "Imported CSV", projectionScenario, inflationRate);
}

export function buildDriftScanFromBackupSummary(
  summary: BackupScanSummary,
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO
): DriftScan {
  const scanState =
    summary.monthlyOverspendCents > 0
      ? {
          state: "drift_detected" as const,
          title: "Overspending found",
          message: "This restored backup shows categories where recent spending increased above the old normal."
        }
      : {
          state: "stable" as const,
          title: "Everything looks steady",
          message: "This restored backup did not include active overspend."
        };

  return {
    score: summary.score,
    scoreLabel: String(summary.score),
    sourceLabel: "Restored backup",
    transactionCount: 0,
    monthlyOverspendCents: summary.monthlyOverspendCents,
    monthlyOverspendLabel: formatCurrency(summary.monthlyOverspendCents),
    investmentGainCents: summary.investmentGainCents,
    investmentGainLabel: formatCurrency(summary.investmentGainCents),
    redirectedSavingsCents: summary.redirectedSavingsCents,
    redirectedSavingsLabel: formatCurrency(summary.redirectedSavingsCents),
    annualInflationRate: getDefaultInflationRate().annualRate,
    inflationRateLabel: formatInflationRateLabel(getDefaultInflationRate().annualRate),
    inflationSourceLabel: "Restored summary",
    projectionScenario,
    projectionScenarioLabel: formatProjectionScenario(projectionScenario),
    baselineWindowLabel: "Restored summary",
    recentWindowLabel: "Restored summary",
    scanState: scanState.state,
    scanStateTitle: scanState.title,
    scanStateMessage: scanState.message,
    topCategories: summary.topCategories.map((category) => ({
      category: category.category,
      baselineMonthlyCents: category.baselineMonthlyCents,
      recentMonthlyCents: category.recentMonthlyCents,
      monthlyOverspendCents: category.monthlyOverspendCents,
      baselineLabel: formatCurrency(category.baselineMonthlyCents),
      recentLabel: formatCurrency(category.recentMonthlyCents),
      monthlyOverspendLabel: formatCurrency(category.monthlyOverspendCents),
      driftPercentLabel: formatRestoredDriftPercent(category),
      stateLabel: normalizeCategoryStateLabel(category.stateLabel),
      barPercent: Math.min(
        100,
        Math.max(4, Math.round((category.monthlyOverspendCents / Math.max(1, summary.monthlyOverspendCents)) * 100))
      )
    })),
    newPatterns: summary.newPatterns.map((pattern) => ({
      category: pattern.category,
      recentMonthlyCents: pattern.recentMonthlyCents,
      recentMonthlyLabel: formatCurrency(pattern.recentMonthlyCents),
      recentWindowLabel: "Restored summary",
      reviewLabel: "New pattern, not Drift"
    })),
    privacyItems: [
      "This restore loaded synced summaries, saved pattern notes, intercept choices, and what-if settings.",
      "Raw transaction rows were not restored because Drift does not upload them to account backup.",
      "Import CSV or sync Plaid again to review individual transactions on this device."
    ]
  };
}

export function buildDriftScan(
  transactions: DriftTransaction[],
  sourceLabel: string,
  projectionScenario: ProjectionScenario = DEFAULT_PROJECTION_SCENARIO,
  inflationRate: InflationRateSnapshot = getDefaultInflationRate()
): DriftScan {
  const windowSizes = chooseWindowSizes(transactions);
  const analysis = analyzeDrift(transactions, {
    ...windowSizes,
    annualInflationRate: inflationRate.annualRate
  });
  const newPatterns = buildNewPatterns(transactions, analysis.baselineMonths, analysis.recentMonths);
  const driftingCategories = analysis.categories.filter(
    (category) => category.monthlyOverspendCents > 0
  );
  const scanState = describeScanState(analysis.categories, driftingCategories);
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
    investmentGainCents: counterfactual.projectedGainCents,
    investmentGainLabel: formatCurrency(counterfactual.projectedGainCents),
    redirectedSavingsCents: counterfactual.principalCents,
    redirectedSavingsLabel: formatCurrency(counterfactual.principalCents),
    annualInflationRate: inflationRate.annualRate,
    inflationRateLabel: formatInflationRateLabel(inflationRate.annualRate),
    inflationSourceLabel: inflationRate.sourceLabel,
    projectionScenario,
    projectionScenarioLabel: formatProjectionScenario(projectionScenario),
    baselineWindowLabel: formatMonthWindow(analysis.baselineMonths),
    recentWindowLabel: formatMonthWindow(analysis.recentMonths),
    scanState: scanState.state,
    scanStateTitle: scanState.title,
    scanStateMessage: scanState.message,
    topCategories: analysis.categories.map(toDriftScanCategory),
    newPatterns,
    privacyItems: [
      "Raw transactions stay local and encrypted in this browser.",
      "Saved pattern notes and intercept choices stay local unless backup is enabled.",
      "AI runs locally first; optional account backup syncs summaries, not raw rows."
    ]
  };
}

function buildNewPatterns(
  transactions: DriftTransaction[],
  baselineMonths: string[],
  recentMonths: string[]
): NewPattern[] {
  if (baselineMonths.length === 0 || recentMonths.length === 0) {
    return [];
  }

  const categories = [...new Set(transactions.map((transaction) => transaction.category))].sort();

  return categories
    .map((category) => {
      const baselineTotal = sumCategorySpend(transactions, category, baselineMonths);
      const recentTotal = sumCategorySpend(transactions, category, recentMonths);

      if (baselineTotal > 0 || recentTotal <= 0) {
        return null;
      }

      const recentMonthlyCents = Math.round(recentTotal / recentMonths.length);

      return {
        category,
        recentMonthlyCents,
        recentMonthlyLabel: formatCurrency(recentMonthlyCents),
        recentWindowLabel: formatMonthWindow(recentMonths),
        reviewLabel: "New pattern, not Drift" as const
      };
    })
    .filter((pattern): pattern is NewPattern => pattern !== null)
    .sort((left, right) => {
      if (right.recentMonthlyCents !== left.recentMonthlyCents) {
        return right.recentMonthlyCents - left.recentMonthlyCents;
      }

      return left.category.localeCompare(right.category);
    });
}

function sumCategorySpend(
  transactions: DriftTransaction[],
  category: string,
  months: string[]
): number {
  const monthSet = new Set(months);

  return transactions
    .filter(
      (transaction) =>
        transaction.category === category && monthSet.has(transaction.transactionDate.slice(0, 7))
    )
    .reduce((total, transaction) => total + transaction.amountCents, 0);
}

export function clampProjectionScenario(scenario: ProjectionScenario): ProjectionScenario {
  return {
    years: clampWholeNumber(scenario.years, 1, 40),
    annualReturnRate: clampDecimal(scenario.annualReturnRate, 0, 0.2)
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
    baselineMonthlyCents: category.baselineMonthlyCents,
    recentMonthlyCents: category.recentMonthlyCents,
    monthlyOverspendCents: category.monthlyOverspendCents,
    baselineLabel: formatCurrency(category.baselineMonthlyCents),
    recentLabel: formatCurrency(category.recentMonthlyCents),
    monthlyOverspendLabel: formatCurrency(category.monthlyOverspendCents),
    driftPercentLabel: `${category.driftPercent}%`,
    stateLabel: formatState(category),
    barPercent: Math.min(100, Math.max(4, Math.round((category.driftPercent / 120) * 100)))
  };
}

function formatState(category: CategoryDrift): CategoryStateLabel {
  if (category.recentMonthlyCents === 0 && category.baselineMonthlyCents > 0) {
    return "No longer active";
  }

  if (category.driftState === "high_drift") {
    return "High drift";
  }

  if (category.driftState === "watch") {
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

  if (startMonth === endMonth) {
    return formatMonth(startMonth);
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

function formatRestoredDriftPercent(category: {
  baselineMonthlyCents: number;
  recentMonthlyCents: number;
}): string {
  if (category.baselineMonthlyCents <= 0) {
    return "0%";
  }

  const driftPercent = Math.max(
    0,
    Math.round(
      ((category.recentMonthlyCents - category.baselineMonthlyCents) /
        category.baselineMonthlyCents) *
        100
    )
  );

  return `${driftPercent}%`;
}

function normalizeCategoryStateLabel(value: string): CategoryStateLabel {
  if (
    value === "Stable" ||
    value === "Watch" ||
    value === "High drift" ||
    value === "No longer active"
  ) {
    return value;
  }

  return "Stable";
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

function describeScanState(
  categories: CategoryDrift[],
  driftingCategories: CategoryDrift[]
): { state: ScanState; title: string; message: string } {
  if (categories.length === 0) {
    return {
      state: "not_enough_data",
      title: "More history needed",
      message: "Drift needs at least two spending months with overlapping categories to compare old normal against recent normal."
    };
  }

  if (driftingCategories.length > 0) {
    return {
      state: "drift_detected",
      title: "Overspending found",
      message: "Drift found categories where recent spending increased above the old normal."
    };
  }

  const hasContraction = categories.some(
    (category) => category.recentMonthlyCents === 0 && category.baselineMonthlyCents > 0
  );

  if (hasContraction) {
    return {
      state: "contraction",
      title: "No overspending found",
      message: "Spending decreased in this window. Drift did not find lifestyle inflation in the returned Plaid history."
    };
  }

  return {
    state: "stable",
    title: "Everything looks steady",
    message: "Spending stayed close to your old normal in this window. A 0 Drift Score means there is no overspend to explain."
  };
}

function chooseWindowSizes(transactions: DriftTransaction[]): {
  baselineMonths: number;
  recentMonths: number;
} {
  const monthCount = new Set(
    transactions.map((transaction) => transaction.transactionDate.slice(0, 7))
  ).size;

  if (monthCount >= 2) {
    const windowMonths = Math.max(1, Math.floor(monthCount / 2));

    return {
      baselineMonths: windowMonths,
      recentMonths: windowMonths
    };
  }

  return {
    baselineMonths: DEFAULT_WINDOW_MONTHS,
    recentMonths: DEFAULT_WINDOW_MONTHS
  };
}
