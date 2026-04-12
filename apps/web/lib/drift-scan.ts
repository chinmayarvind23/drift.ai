import {
  analyzeDrift,
  parseTransactionsCsv,
  projectCounterfactualWealth,
  type CategoryDrift,
  type DriftTransaction
} from "@drift/core";

type CategoryStateLabel = "Stable" | "Watch" | "High drift";
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
  projectionScenario: ProjectionScenario;
  projectionScenarioLabel: string;
  baselineWindowLabel: string;
  recentWindowLabel: string;
  scanState: ScanState;
  scanStateTitle: string;
  scanStateMessage: string;
  topCategories: DriftScanCategory[];
  privacyItems: string[];
}

export interface ProjectionScenario {
  years: number;
  annualReturnRate: number;
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
  const windowSizes = chooseWindowSizes(transactions);
  const analysis = analyzeDrift(transactions, windowSizes);
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
    projectionScenario,
    projectionScenarioLabel: formatProjectionScenario(projectionScenario),
    baselineWindowLabel: formatMonthWindow(analysis.baselineMonths),
    recentWindowLabel: formatMonthWindow(analysis.recentMonths),
    scanState: scanState.state,
    scanStateTitle: scanState.title,
    scanStateMessage: scanState.message,
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
    baselineMonthlyCents: category.baselineMonthlyCents,
    recentMonthlyCents: category.recentMonthlyCents,
    monthlyOverspendCents: category.monthlyOverspendCents,
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
    (category) => category.recentMonthlyCents < category.baselineMonthlyCents
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
