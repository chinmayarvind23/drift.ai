"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { InfoHint } from "@/components/audit-ui";

export default function CategoryDetailPage() {
  const params = useParams<{ name: string }>();
  const categoryName = decodeURIComponent(params.name);
  const { behaviorInsights, editedTransactions, scan } = useAuditWorkspace();
  const category = scan.topCategories.find((item) => item.category === categoryName);
  const insight = behaviorInsights[categoryName];
  const transactions = editedTransactions
    .filter((transaction) => transaction.category === categoryName)
    .sort((left, right) => right.transactionDate.localeCompare(left.transactionDate));
  const monthlyTotals = groupMonthlyTotals(transactions);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <Link className="text-sm text-muted-foreground underline-offset-4 hover:underline" href="/">
          Back to scan
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold">{categoryName}</h1>
          {category ? <Badge className="rounded-[8px] border-border bg-background text-muted-foreground">{category.stateLabel}</Badge> : null}
        </div>
        {category ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MetricBlock label="Old monthly average" value={category.baselineLabel} />
            <MetricBlock label="Recent monthly average" value={category.recentLabel} />
            <MetricBlock label="Monthly overspend" value={category.monthlyOverspendLabel} />
            <MetricBlock
              info="This is the percent increase above the old monthly average for this category. Positive category increases feed the overall Drift Score."
              label="Drift score contribution"
              value={category.driftPercentLabel}
            />
          </div>
        ) : (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            This category is not present in the current scan. Import or sync transactions first.
          </p>
        )}
        {category ? (
          <p className="mt-4 rounded-[8px] border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
            Monthly averages compare earlier months with recent months. The timeline below shows transaction totals in each month.
          </p>
        ) : null}

        <div className="mt-6 surface-card">
          <p className="text-xs font-medium uppercase text-muted-foreground">Behavior note</p>
          <p className="mt-2 text-sm leading-6">
            {insight ? insight.summary : "No Pattern Lab note saved for this category yet."}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface-panel">
          <h2 className="text-xl font-semibold">Monthly timeline</h2>
          <div className="mt-5 space-y-3">
            {monthlyTotals.length > 0 ? monthlyTotals.map((month) => (
              <div key={month.month} className="grid grid-cols-[96px_1fr_90px] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{month.month}</span>
                <div className="h-2 overflow-hidden rounded-[8px] bg-muted">
                  <div className="h-full rounded-[8px] bg-primary" style={{ width: `${month.percent}%` }} />
                </div>
                <span className="text-right font-medium">{formatCurrency(month.amountCents)}</span>
              </div>
            )) : (
              <p className="text-sm leading-6 text-muted-foreground">No transactions for this category yet.</p>
            )}
          </div>
        </div>

        <div className="surface-panel">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <div className="mt-5 space-y-3">
            {transactions.slice(0, 16).map((transaction) => (
              <div key={transaction.sourceHash} className="flex items-start justify-between gap-3 border-b border-border pb-3 text-sm last:border-b-0 last:pb-0">
                <div>
                  <p className="font-medium">{transaction.merchantName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{transaction.transactionDate}</p>
                  {transaction.note ? <p className="mt-2 text-xs text-muted-foreground">{transaction.note}</p> : null}
                </div>
                <p className="font-semibold">{formatCurrency(transaction.amountCents)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricBlock({ info, label, value }: { info?: string; label: string; value: string }) {
  return (
    <div className="surface-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        {info ? <InfoHint href="/methodology" text={info} /> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function groupMonthlyTotals(transactions: Array<{ transactionDate: string; amountCents: number }>) {
  const totals = new Map<string, number>();

  transactions.forEach((transaction) => {
    const month = transaction.transactionDate.slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + transaction.amountCents);
  });

  const maxTotal = Math.max(...totals.values(), 1);

  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, amountCents]) => ({
      month,
      amountCents,
      percent: Math.max(4, Math.round((amountCents / maxTotal) * 100))
    }));
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}
