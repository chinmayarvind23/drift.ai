"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { CategoryRow, InfoHint, Metric, PatternQuestion, PrivacyStatus, SnapshotTiles } from "@/components/audit-ui";

export default function ScanPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    importError,
    loadCsvFile,
    scan,
    sourceMessage
  } = useAuditWorkspace();
  const topDriftCategories = scan.topCategories.filter((category) => category.stateLabel !== "Stable");

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:py-8">
      <section className="surface-panel">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge className="mb-4 rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
              {scan.transactionCount > 0 ? "Scan complete" : "Waiting for evidence"}
            </Badge>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] md:text-6xl">
              Where did the raise go?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
              Drift compares your old normal with your recent normal, then points to the
              spending patterns that quietly changed.
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
          <Metric
            label="Drift score"
            value={scan.scoreLabel}
            tone={scan.scanState === "drift_detected" ? "amber" : "emerald"}
            explanation="This is the overall shift from your old spending normal to your recent spending normal. Bigger repeated increases count more than tiny changes. A 0 means no repeated overspend was found in this window."
            learnHref="/methodology"
          />
          <Metric label="Overspend" value={scan.monthlyOverspendLabel} tone="rose" explanation="This is the extra amount showing up each month compared with your old baseline." />
          <Metric
            label="If saved and invested"
            value={scan.investmentGainLabel}
            tone="emerald"
            explanation={`This is the estimated investment growth above the money redirected from overspend. At 0% return, the growth is $0. Current scenario: ${scan.projectionScenarioLabel}.`}
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
            <h2 className="text-lg font-semibold">Evidence of drift</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>Old normal {scan.baselineWindowLabel} compared with recent normal {scan.recentWindowLabel}.</span>
              <InfoHint text="Drift adapts to the transaction duration: it compares the earliest half of available months with the latest half. With two months, that means one old-normal month versus one recent-normal month." />
            </div>
          </div>
          <Badge className="w-fit rounded-[8px] border-border bg-background text-muted-foreground">
            {topDriftCategories.length} patterns flagged
          </Badge>
        </div>

        <div className="mt-5 space-y-4">
          {scan.topCategories.length > 0 ? scan.topCategories.map((category) => <CategoryRow key={category.category} category={category} />) : (
            <div className="surface-card text-sm leading-6 text-muted-foreground">
              Import at least two months of transaction history so Drift can compare your old normal with your recent normal.
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
        <PatternQuestion category={topDriftCategories[0]?.category ?? scan.topCategories[0]?.category ?? "Your top pattern"} />
        <PrivacyStatus items={scan.privacyItems} />
        <SnapshotTiles transactionCount={scan.transactionCount} scenarioLabel={scan.projectionScenarioLabel} />
      </aside>
    </div>
  );
}
