"use client";

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { buildRecoveryPlan } from "@/lib/recovery-plan";

export default function PlanPage() {
  const { scan } = useAuditWorkspace();
  const plan = buildRecoveryPlan(scan);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.85fr_1.15fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
          30-day reset
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Recovery plan</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Keep the parts of the new normal you actually want. Reset the repeated drift with
          the least behavior change first.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1">
          <div className="surface-card">
            <p className="text-xs font-medium uppercase text-muted-foreground">Monthly target</p>
            <p className="mt-2 text-4xl font-semibold">{plan.monthlyTargetLabel}</p>
          </div>
          <div className="surface-card">
            <p className="text-xs font-medium uppercase text-muted-foreground">Annual room reopened</p>
            <p className="mt-2 text-4xl font-semibold">{plan.annualTargetLabel}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {plan.steps.length > 0 ? (
          plan.steps.map((step, index) => (
            <article key={step.category} className="surface-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{step.category}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Old normal {step.oldNormalLabel}. Recent normal {step.currentMonthlyLabel}.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-semibold">{step.targetReductionLabel}</p>
                  <p className="text-xs text-muted-foreground">{step.actionLabel}</p>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
                <Target className="mt-0.5 size-4 shrink-0 text-foreground" />
                <p>{step.prompt}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="surface-panel text-sm leading-6 text-muted-foreground">
            Load a profile or import at least six months of transactions to build a reset plan.
          </div>
        )}
      </div>
    </section>
  );
}
