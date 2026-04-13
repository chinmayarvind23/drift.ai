"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { LeadCapture } from "@/components/lead-capture";
import { InfoHint } from "@/components/audit-ui";
import { getPaymentProofConfig } from "@/lib/payment-proof";
import { buildRecoveryPlan } from "@/lib/recovery-plan";
import { buildReportSummary } from "@/lib/report-copy";

export default function ReportPage() {
  const { behaviorInsights, interceptDecisions, scan } = useAuditWorkspace();
  const insights = Object.values(behaviorInsights);
  const recoveryPlan = buildRecoveryPlan(scan, behaviorInsights);
  const reportSummary = buildReportSummary(scan);
  const paymentProof = getPaymentProofConfig();

  return (
    <section className="mx-auto max-w-5xl px-5 py-6 md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          Private report
        </Badge>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Drift Scan report</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              A local report of what changed, why it changed, and what the repeated pattern could mean.
            </p>
          </div>
          <Button className="h-10 rounded-[8px]" onClick={() => window.print()}>
            Export / print
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <ReportMetric
            info="The overall score is built from category overspend compared with the old monthly average. Higher scores mean more repeated spending moved into the recent normal."
            label="Drift Score"
            value={scan.scoreLabel}
          />
          <ReportMetric label="Monthly overspend" value={scan.monthlyOverspendLabel} />
          <ReportMetric label="What-if growth" value={scan.investmentGainLabel} />
        </div>

        <div className="mt-7 rounded-[8px] border border-primary/20 bg-primary/5 p-5">
          <h2 className="text-xl font-semibold">Executive summary</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {reportSummary.executiveSummary}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[8px] border border-border bg-background p-4 text-sm">
              <p className="font-semibold">Time saved</p>
              <p className="mt-2 text-muted-foreground">45 spreadsheet minutes replaced by a 3-minute scan, tag, and action flow.</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background p-4 text-sm">
              <p className="font-semibold">Target user</p>
              <p className="mt-2 text-muted-foreground">A busy professional after a raise, move, new job, or stressful season.</p>
            </div>
            <div className="rounded-[8px] border border-border bg-background p-4 text-sm">
              <p className="font-semibold">Private by default</p>
              <p className="mt-2 text-muted-foreground">The report is built from summaries, behavior notes, and decisions. Raw rows stay local.</p>
            </div>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <h2 className="text-xl font-semibold">Top 3 drift patterns</h2>
          {scan.topCategories.filter((category) => category.monthlyOverspendCents > 0).slice(0, 3).map((category) => (
            <div key={category.category} className="surface-card text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{category.category}</p>
                  <p className="mt-1 text-muted-foreground">
                    Old normal {category.baselineLabel}. Recent normal {category.recentLabel}.
                  </p>
                </div>
                <p className="font-semibold">{category.monthlyOverspendLabel}</p>
              </div>
            </div>
          ))}
          {reportSummary.topPatternLabels.length === 0 ? (
            <p className="surface-card text-sm leading-6 text-muted-foreground">No repeated overspending was found in this scan.</p>
          ) : null}
        </div>

        <div className="mt-7 space-y-3">
          <h2 className="text-xl font-semibold">New patterns to review</h2>
          {scan.newPatterns.length > 0 ? scan.newPatterns.map((pattern) => (
            <div key={pattern.category} className="surface-card text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">{pattern.category}</p>
                  <p className="mt-1 text-muted-foreground">
                    Started at {pattern.recentMonthlyLabel}/month in {pattern.recentWindowLabel}. This does not affect Drift Score.
                  </p>
                </div>
                <Badge className="w-fit rounded-[8px] border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                  {pattern.reviewLabel}
                </Badge>
              </div>
            </div>
          )) : (
            <p className="surface-card text-sm leading-6 text-muted-foreground">No new baseline-free categories need review.</p>
          )}
        </div>

        <div className="mt-7 rounded-[8px] border border-primary/20 bg-primary/5 p-5">
          <h2 className="text-xl font-semibold">30-day recovery path</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            AI behavior tags shape the recovery language so the next move matches why the pattern started.
          </p>
          <div className="mt-4 space-y-3">
            {recoveryPlan.steps.length > 0 ? recoveryPlan.steps.map((step) => (
              <div key={step.category} className="rounded-[8px] border border-border bg-background p-4 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{step.category} · {step.behaviorTagLabel}</p>
                    <p className="mt-2 leading-6 text-muted-foreground">{step.prompt}</p>
                    <p className="mt-2 leading-6 text-muted-foreground">{step.aiRecoveryPath}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{step.whyItHelps}</p>
                  </div>
                  <p className="font-semibold">{step.targetReductionLabel}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm leading-6 text-muted-foreground">No recovery path needed while the scan is steady.</p>
            )}
          </div>
        </div>

        <div className="mt-7 grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="text-xl font-semibold">AI behavior explanation</h2>
            <div className="mt-3 space-y-3">
              {insights.length > 0 ? insights.map((insight) => (
                <div key={insight.category} className="surface-card text-sm">
                  <p className="font-semibold">{insight.category} · {insight.tagLabel}</p>
                  <p className="mt-2 leading-6 text-muted-foreground">{insight.summary}</p>
                </div>
              )) : (
                <p className="text-sm leading-6 text-muted-foreground">No Pattern Lab notes saved yet.</p>
              )}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Intercept result</h2>
            <div className="mt-3 space-y-3">
              {interceptDecisions.length > 0 ? interceptDecisions.map((decision) => (
                <div key={decision.id} className="surface-card text-sm">
                  <p className="font-semibold">{decision.merchantName}</p>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {decision.category} purchase marked {decision.decision}.
                  </p>
                  <p className="mt-2 leading-6 text-muted-foreground">{decision.ahaMessage}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{decision.nextMove}</p>
                </div>
              )) : (
                <p className="text-sm leading-6 text-muted-foreground">No intercept decisions saved yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-7 rounded-[8px] border border-border bg-background p-4">
          <p className="text-sm font-semibold">Unlock report export</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Get the printable private report with the diagnosis, behavior explanation, recovery path, intercept result, and privacy note.
          </p>
          {paymentProof.enabled && paymentProof.href ? (
            <Button className="mt-4 h-10 rounded-[8px]" asChild>
              <a href={paymentProof.href}>{paymentProof.label}</a>
            </Button>
          ) : (
            <div className="mt-4 rounded-[8px] border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold">{paymentProof.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paymentProof.setupHint}
              </p>
            </div>
          )}
        </div>

        <div className="mt-7 rounded-[8px] border border-border bg-background p-4">
          <p className="text-sm font-semibold">Send me my Drift report</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Email yourself a reminder to finish or revisit this scan.
          </p>
          <LeadCapture />
        </div>

        <div className="mt-4 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
          Privacy note: raw transactions stayed in this browser. Account backup syncs summaries, behavior notes, intercept decisions, and what-if settings only.
        </div>
      </div>
    </section>
  );
}

function ReportMetric({ info, label, value }: { info?: string; label: string; value: string }) {
  return (
    <div className="surface-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        {info ? <InfoHint href="/methodology" text={info} /> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
