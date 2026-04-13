"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccountGate } from "@/components/account-gate";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { LeadCapture } from "@/components/lead-capture";
import { PaymentButton } from "@/components/payment-button";
import { InfoHint } from "@/components/audit-ui";
import {
  buildFinancialReportInsight,
  describeFinancialReportModel,
  type FinancialReportInsight
} from "@/lib/financial-report-ai";
import { buildLocalLlmRecoveryPath, type LocalRecoveryPath } from "@/lib/local-llm";
import { getPaymentProofConfig } from "@/lib/payment-proof";
import { exportReportPdf } from "@/lib/report-pdf";
import { buildRecoveryPlan } from "@/lib/recovery-plan";
import { buildReportSummary } from "@/lib/report-copy";
import { buildReportInterceptSummary } from "@/lib/spend-intercept";

export default function ReportPage() {
  const { behaviorInsights, interceptDecisions, scan } = useAuditWorkspace();
  const insights = Object.values(behaviorInsights);
  const recoveryPlan = useMemo(
    () => buildRecoveryPlan(scan, behaviorInsights),
    [behaviorInsights, scan]
  );
  const reportSummary = useMemo(() => buildReportSummary(scan), [scan]);
  const paymentProof = getPaymentProofConfig();
  const [financialInsight, setFinancialInsight] = useState<FinancialReportInsight | null>(null);
  const [localRecoveryPaths, setLocalRecoveryPaths] = useState<Record<string, LocalRecoveryPath>>({});
  const interceptSummaries = useMemo(
    () => interceptDecisions.map(buildReportInterceptSummary),
    [interceptDecisions]
  );

  useEffect(() => {
    let isMounted = true;

    async function analyzeReport() {
      const insight = await buildFinancialReportInsight({
        executiveSummary: reportSummary.executiveSummary,
        monthlyOverspendLabel: scan.monthlyOverspendLabel,
        topPatternCount: reportSummary.topPatternLabels.length
      });

      if (isMounted) {
        setFinancialInsight(insight);
      }
    }

    void analyzeReport();

    return () => {
      isMounted = false;
    };
  }, [reportSummary.executiveSummary, reportSummary.topPatternLabels.length, scan.monthlyOverspendLabel]);

  useEffect(() => {
    let isMounted = true;

    async function buildLocalRecoveryPaths() {
      const entries = await Promise.all(
        recoveryPlan.steps.map(async (step) => {
          const insight = behaviorInsights[step.category];
          const path = await buildLocalLlmRecoveryPath({
            category: step.category,
            overspendLabel: step.targetReductionLabel,
            behaviorTagLabel: step.behaviorTagLabel,
            userAnswer: insight?.answer
          });

          return [step.category, path] as const;
        })
      );

      if (isMounted) {
        setLocalRecoveryPaths(Object.fromEntries(entries));
      }
    }

    void buildLocalRecoveryPaths();

    return () => {
      isMounted = false;
    };
  }, [behaviorInsights, recoveryPlan.steps]);

  async function downloadPdf() {
    await exportReportPdf({
      scoreLabel: scan.scoreLabel,
      monthlyOverspendLabel: scan.monthlyOverspendLabel,
      investmentGainLabel: scan.investmentGainLabel,
      executiveSummary: reportSummary.executiveSummary,
      recoverySteps: recoveryPlan.steps.map((step) => {
        const localPath = localRecoveryPaths[step.category];

        return `${step.category}: ${localPath?.text ?? step.aiRecoveryPath}`;
      }),
      interceptSummaries: interceptSummaries.map(
        (summary) => `${summary.tagLabel}: ${summary.summary}`
      ),
      privacyNote: "Raw transactions stayed in this browser. Account backup syncs summaries, behavior notes, intercept decisions, and what-if settings only."
    });
  }

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
          <AccountGate>
            <Button className="h-10 rounded-[8px]" onClick={downloadPdf}>
              Export PDF
            </Button>
          </AccountGate>
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
          <div className="mt-4 rounded-[8px] border border-border bg-background p-4 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">Financial AI review</p>
                <p className="mt-2 leading-6 text-muted-foreground">
                  {financialInsight?.summary ?? "Reviewing the report summary locally..."}
                </p>
                {financialInsight ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {describeFinancialReportModel(financialInsight)}
                  </p>
                ) : null}
              </div>
              <Badge className="w-fit rounded-[8px] border-border bg-card text-muted-foreground">
                {financialInsight?.label ?? "Reviewing"}
              </Badge>
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
            Drift uses your Pattern Lab answer to suggest one small reset for the next month. The goal is to keep intentional spending and stop the repeat pattern from becoming automatic.
          </p>
          <div className="mt-4 space-y-3">
            {recoveryPlan.steps.length > 0 ? recoveryPlan.steps.map((step) => (
              <div key={step.category} className="rounded-[8px] border border-border bg-background p-4 text-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{step.category} · {step.behaviorTagLabel}</p>
                    <p className="mt-2 leading-6 text-muted-foreground">{step.prompt}</p>
                    <p className="mt-2 leading-6 text-muted-foreground">
                      {localRecoveryPaths[step.category]?.text ?? step.aiRecoveryPath}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {localRecoveryPaths[step.category]?.provider === "ollama"
                        ? "Generated by local Qwen through Ollama."
                        : "Prepared locally without sending transaction history to a cloud model."}
                    </p>
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
              {interceptDecisions.length > 0 ? interceptDecisions.map((decision, index) => (
                <div key={decision.id} className="surface-card text-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-semibold">{decision.merchantName}</p>
                    <Badge className="w-fit rounded-[8px] border-border bg-card text-muted-foreground">
                      {interceptSummaries[index]?.tagLabel}
                    </Badge>
                  </div>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {interceptSummaries[index]?.summary}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{decision.ahaMessage}</p>
                </div>
              )) : (
                <p className="text-sm leading-6 text-muted-foreground">No intercept decisions saved yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="mt-7 rounded-[8px] border border-border bg-background p-4">
          <AccountGate>
            <p className="text-sm font-semibold">Unlock report export</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Get the printable private report with the diagnosis, behavior explanation, recovery path, intercept result, and privacy note.
            </p>
            <PaymentButton href={paymentProof.href} label={paymentProof.label} />
            {!paymentProof.enabled ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Uses secure Stripe Checkout when the server key is configured.
              </p>
            ) : null}
          </AccountGate>
        </div>

        <div className="mt-7 rounded-[8px] border border-border bg-background p-4">
          <AccountGate>
            <p className="text-sm font-semibold">Send me my Drift report</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Email yourself a reminder to finish or revisit this scan.
            </p>
            <LeadCapture />
          </AccountGate>
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
