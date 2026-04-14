"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { CategoryRow, InfoHint, Metric, PatternQuestion, PrivacyStatus, SnapshotTiles } from "@/components/audit-ui";
import { PremiumFeatureGate } from "@/components/premium-feature-gate";
import { buildCashFlowSummary, type CashFlowSummary } from "@/lib/cash-flow";

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    importError,
    editedTransactions,
    loadCsvFile,
    scan,
    sourceMessage
  } = useAuditWorkspace();
  const topDriftCategories = scan.topCategories.filter(
    (category) => category.monthlyOverspendCents > 0
  );
  const cashFlow = buildCashFlowSummary(editedTransactions);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:py-8">
      <section className="surface-panel">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge className="mb-4 rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
              {scan.transactionCount > 0 ? "Scan complete" : "Waiting for transactions"}
            </Badge>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] md:text-6xl">
              See where your spending quietly changed.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
              Drift compares earlier months with recent months, then turns the meaningful
              changes into simple notes, timely checks, and a private recovery report.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <input ref={fileInputRef} aria-label="Import CSV" className="sr-only" type="file" accept=".csv,text/csv" onChange={loadCsvFile} />
            <Button className="h-10 rounded-[8px] px-4" onClick={() => fileInputRef.current?.click()}>
              Import CSV
              <ArrowRight />
            </Button>
            <p className="text-xs text-muted-foreground md:text-right">
              Required CSV columns: date, merchant, amount, category.
            </p>
          </div>
        </div>

        {importError ? <div className="mt-5 rounded-[8px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{importError}</div> : null}
        {sourceMessage ? <div className="mt-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{sourceMessage}</div> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <PremiumFeatureGate featureName="Drift Score">
          <Metric
            label="Drift score"
            value={scan.scoreLabel}
            tone={scan.scanState === "drift_detected" ? "amber" : "emerald"}
            explanation={`This is the overall shift from your old monthly average to your recent monthly average. The old normal is adjusted for inflation before comparison, using ${scan.inflationRateLabel} from ${scan.inflationSourceLabel}. Bigger repeated increases count more than tiny changes. A 0 means no repeated overspend was found in this window.`}
            learnHref="/methodology"
          />
          </PremiumFeatureGate>
          <Metric label="Overspend" value={scan.monthlyOverspendLabel} tone="rose" explanation="This is the extra monthly average spend compared with your old monthly average. It is not the total of one transaction." />
          <Metric
            label="If saved and invested"
            value={scan.investmentGainLabel}
            tone="emerald"
            explanation={`This is the estimated growth above the money redirected from overspend. It changes with the What-if scenario: ${scan.projectionScenarioLabel}.`}
            detail={`${scan.redirectedSavingsLabel} redirected from overspend`}
          />
        </div>

        <Separator className="my-7" />

        {scan.scanState !== "drift_detected" ? (
          <div className="mb-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">{scan.scanStateTitle}</p>
                <p className="mt-1 text-emerald-900/75 dark:text-emerald-100/75">{scan.scanStateMessage}</p>
              </div>
              <Badge className="w-fit rounded-[8px] border-emerald-300 bg-white text-emerald-800 dark:border-emerald-400/30 dark:bg-background dark:text-emerald-100">
                Healthy scan
              </Badge>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Transactions behind the score</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>Earlier months {scan.baselineWindowLabel} compared with recent months {scan.recentWindowLabel}.</span>
              <InfoHint text="Drift adapts to the transaction duration: it compares the earliest half of available months with the latest half. With two months, that means one old-normal month versus one recent-normal month." />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Each category is averaged by month first. Drift compares your old monthly average with your recent monthly average, so one edited transaction changes the monthly average for that whole window.
            </p>
          </div>
          <Badge className="w-fit rounded-[8px] border-border bg-background text-muted-foreground">
            {topDriftCategories.length} patterns flagged
          </Badge>
        </div>

        <div className="mt-5 space-y-4">
          {scan.topCategories.length > 0 ? scan.topCategories.map((category) => <CategoryRow key={category.category} category={category} />) : (
            <div className="surface-card text-sm leading-6 text-muted-foreground">
              Import at least two months of transactions so Drift can compare earlier spending with recent spending.
            </div>
          )}
        </div>

        {scan.newPatterns.length > 0 ? (
          <div className="mt-7 rounded-[8px] border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-400/10">
            <h2 className="text-lg font-semibold">New patterns to review</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              These categories appeared in the recent window with no old baseline. They are worth reviewing, but they do not count toward Drift Score.
            </p>
            <div className="mt-4 space-y-3">
              {scan.newPatterns.map((pattern) => (
                <div className="rounded-[8px] border border-amber-200 bg-background p-4 text-sm dark:border-amber-400/30" key={pattern.category}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold">{pattern.category}</p>
                      <p className="mt-1 text-muted-foreground">
                        New in {pattern.recentWindowLabel} at {pattern.recentMonthlyLabel}/month.
                      </p>
                    </div>
                    <Badge className="w-fit rounded-[8px] border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                      {pattern.reviewLabel}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-6">
        <CashFlowPanel cashFlow={cashFlow} monthlyOverspendLabel={scan.monthlyOverspendLabel} />
        {topDriftCategories[0] ? (
          <PatternQuestion category={topDriftCategories[0].category} />
        ) : null}
        <PrivacyStatus items={scan.privacyItems} />
        <SnapshotTiles transactionCount={scan.transactionCount} scenarioLabel={scan.projectionScenarioLabel} />
      </aside>
    </div>
  );
}

function CashFlowPanel({
  cashFlow,
  monthlyOverspendLabel
}: {
  cashFlow: CashFlowSummary;
  monthlyOverspendLabel: string;
}) {
  const recentMonths = cashFlow.months.slice(-6);
  const pieSlices = buildPieSlices(cashFlow.categoryMix);

  return (
    <section className="surface-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cash flow map</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Income, spending, and projection from the imported rows.
          </p>
        </div>
        <Badge className="w-fit rounded-[8px] border-border bg-background text-muted-foreground">
          Savings projection starts at {monthlyOverspendLabel}/mo
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniStat label="Income change" value={cashFlow.incomeChangeLabel} />
        <MiniStat label="Spend change" value={cashFlow.spendChangeLabel} />
      </div>

      <div className="mt-5 space-y-3">
        {recentMonths.length > 0 ? recentMonths.map((month) => (
          <div key={month.month} className="rounded-[8px] border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{month.monthLabel}</span>
              <span>Net {month.netLabel}</span>
            </div>
            <div className="mt-3 space-y-2">
              <FlowBar label="Income" value={month.incomeLabel} width={month.incomePercent} tone="emerald" />
              <FlowBar label="Spend" value={month.spendLabel} width={month.spendPercent} tone="rose" />
            </div>
          </div>
        )) : (
          <p className="rounded-[8px] border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
            Import transactions to map income and spending.
          </p>
        )}
      </div>

      {cashFlow.categoryMix.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
          <div
            aria-label="Spending category mix"
            className="mx-auto size-28 rounded-full border border-border"
            style={{ background: `conic-gradient(${pieSlices})` }}
          />
          <div className="space-y-2">
            {cashFlow.categoryMix.slice(0, 4).map((item, index) => (
              <div className="flex items-center justify-between gap-3 text-sm" key={item.category}>
                <span className="inline-flex items-center gap-2">
                  <span className={`size-2 rounded-full ${pieColorClass(index)}`} />
                  {item.category}
                </span>
                <span className="font-medium">{item.amountLabel}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function FlowBar({
  label,
  tone,
  value,
  width
}: {
  label: string;
  tone: "emerald" | "rose";
  value: string;
  width: number;
}) {
  const color = tone === "emerald" ? "bg-emerald-600" : "bg-rose-500";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-[8px] bg-muted">
        <div className={`h-full rounded-[8px] ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function buildPieSlices(items: CashFlowSummary["categoryMix"]): string {
  if (items.length === 0) {
    return "#e5e7eb 0deg 360deg";
  }

  let cursor = 0;

  return items.map((item, index) => {
    const degrees = Math.max(4, Math.round((item.percent / 100) * 360));
    const start = cursor;
    const end = Math.min(360, cursor + degrees);

    cursor = end;

    return `${pieColor(index)} ${start}deg ${end}deg`;
  }).join(", ");
}

function pieColor(index: number): string {
  return ["#059669", "#e11d48", "#525252", "#f59e0b", "#0f766e"][index % 5];
}

function pieColorClass(index: number): string {
  return [
    "bg-emerald-600",
    "bg-rose-600",
    "bg-neutral-600",
    "bg-amber-500",
    "bg-teal-700"
  ][index % 5];
}
