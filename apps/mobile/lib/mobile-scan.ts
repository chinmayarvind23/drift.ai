import { analyzeDrift, projectCounterfactualWealth, type DriftTransaction } from "@drift/core";

export function buildDemoDriftScan() {
  const transactions = buildSeedTransactions();
  const analysis = analyzeDrift(transactions, {
    baselineMonths: 3,
    recentMonths: 3
  });
  const monthlyOverspendCents = analysis.categories.reduce(
    (total, category) => total + category.monthlyOverspendCents,
    0
  );
  const counterfactual = projectCounterfactualWealth({
    monthlyOverspendCents,
    years: 10,
    annualReturnRate: 0.07
  });

  return {
    scoreLabel: String(analysis.driftScore),
    monthlyOverspendLabel: formatCurrency(monthlyOverspendCents),
    investmentGainLabel: formatCurrency(counterfactual.projectedGainCents)
  };
}

function buildSeedTransactions(): DriftTransaction[] {
  const baselineMonths = ["2025-07", "2025-08", "2025-09"];
  const recentMonths = ["2026-01", "2026-02", "2026-03"];

  return [
    ...baselineMonths.map((month) => buildTransaction(month, "Dining", 12_000)),
    ...recentMonths.map((month) => buildTransaction(month, "Dining", 40_000))
  ];
}

function buildTransaction(
  month: string,
  category: string,
  amountCents: number
): DriftTransaction {
  const sourceHash = `${month}-${category}-${amountCents}`;

  return {
    id: sourceHash,
    transactionDate: `${month}-15`,
    merchantName: `${category} sample`,
    amountCents,
    category,
    sourceHash,
    source: "seed"
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
