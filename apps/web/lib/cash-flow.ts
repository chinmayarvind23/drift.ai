import type { DriftTransaction } from "@drift/core";

export interface CashFlowMonth {
  month: string;
  monthLabel: string;
  incomeCents: number;
  spendCents: number;
  netCents: number;
  incomeLabel: string;
  spendLabel: string;
  netLabel: string;
  incomePercent: number;
  spendPercent: number;
}

export interface CategoryMixItem {
  category: string;
  amountCents: number;
  amountLabel: string;
  percent: number;
}

export interface CashFlowSummary {
  months: CashFlowMonth[];
  categoryMix: CategoryMixItem[];
  totalIncomeLabel: string;
  totalSpendLabel: string;
  incomeChangeLabel: string;
  spendChangeLabel: string;
}

export function buildCashFlowSummary(transactions: DriftTransaction[]): CashFlowSummary {
  const monthTotals = new Map<string, { incomeCents: number; spendCents: number }>();
  const categoryTotals = new Map<string, number>();

  for (const transaction of transactions) {
    const month = transaction.transactionDate.slice(0, 7);
    const current = monthTotals.get(month) ?? { incomeCents: 0, spendCents: 0 };

    if (transaction.direction === "income") {
      current.incomeCents += transaction.amountCents;
    } else {
      current.spendCents += transaction.amountCents;
      categoryTotals.set(
        transaction.category,
        (categoryTotals.get(transaction.category) ?? 0) + transaction.amountCents
      );
    }

    monthTotals.set(month, current);
  }

  const maxMonthlyAmount = Math.max(
    1,
    ...[...monthTotals.values()].flatMap((month) => [month.incomeCents, month.spendCents])
  );
  const months = [...monthTotals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, totals]) => {
      const netCents = totals.incomeCents - totals.spendCents;

      return {
        month,
        monthLabel: formatMonth(month),
        incomeCents: totals.incomeCents,
        spendCents: totals.spendCents,
        netCents,
        incomeLabel: formatCurrency(totals.incomeCents),
        spendLabel: formatCurrency(totals.spendCents),
        netLabel: formatCurrency(netCents),
        incomePercent: Math.max(4, Math.round((totals.incomeCents / maxMonthlyAmount) * 100)),
        spendPercent: Math.max(4, Math.round((totals.spendCents / maxMonthlyAmount) * 100))
      };
    });
  const totalIncomeCents = months.reduce((total, month) => total + month.incomeCents, 0);
  const totalSpendCents = months.reduce((total, month) => total + month.spendCents, 0);
  const totalCategorySpend = Math.max(1, [...categoryTotals.values()].reduce((total, amount) => total + amount, 0));
  const categoryMix = [...categoryTotals.entries()]
    .map(([category, amountCents]) => ({
      category,
      amountCents,
      amountLabel: formatCurrency(amountCents),
      percent: Math.max(4, Math.round((amountCents / totalCategorySpend) * 100))
    }))
    .sort((left, right) => right.amountCents - left.amountCents)
    .slice(0, 5);

  return {
    months,
    categoryMix,
    totalIncomeLabel: formatCurrency(totalIncomeCents),
    totalSpendLabel: formatCurrency(totalSpendCents),
    incomeChangeLabel: formatChange(months.at(-1)?.incomeCents ?? 0, months[0]?.incomeCents ?? 0),
    spendChangeLabel: formatChange(months.at(-1)?.spendCents ?? 0, months[0]?.spendCents ?? 0)
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

function formatChange(recentCents: number, oldCents: number): string {
  const change = recentCents - oldCents;
  const label = formatCurrency(Math.abs(change));

  if (change > 0) {
    return `+${label}`;
  }

  if (change < 0) {
    return `-${label}`;
  }

  return "$0";
}

function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}
