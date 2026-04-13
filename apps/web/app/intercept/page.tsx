"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuditWorkspace } from "@/components/audit-workspace";
import { buildSpendIntercept, decideIntercept, type SpendIntercept } from "@/lib/spend-intercept";

export default function InterceptPage() {
  const {
    behaviorInsights,
    interceptDecisions,
    saveInterceptDecision,
    scan
  } = useAuditWorkspace();
  const driftCategories = useMemo(
    () => scan.topCategories.filter((item) => item.monthlyOverspendCents > 0),
    [scan.topCategories]
  );
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [intercept, setIntercept] = useState<SpendIntercept | null>(null);

  function simulateTransaction() {
    setIntercept(
      buildSpendIntercept(scan, {
        merchantName: merchantName.trim(),
        amountCents: Math.round(Number(amount) * 100),
        category
      }, behaviorInsights)
    );
  }

  function saveDecision(decision: "intentional" | "dismissed") {
    if (!intercept) {
      return;
    }

    const savedDecision = decideIntercept(intercept, decision);
    saveInterceptDecision(savedDecision);
    setIntercept(savedDecision);
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[0.9fr_1.1fr] md:px-8 lg:py-8">
      <div className="surface-panel">
        <Badge className="rounded-[8px] border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          Demo intercept
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold">Spend intercept</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Simulate a new transaction and check whether it repeats a high-drift category.
        </p>

        <div className="mt-6 grid gap-4">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Merchant</span>
            <input className="field-control" placeholder="Example: Bar Luce" value={merchantName} onChange={(event) => setMerchantName(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Amount</span>
            <input className="field-control" min={1} placeholder="Example: 72" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Category</span>
            <select className="field-control" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Choose a category</option>
              {driftCategories.map((item) => (
                <option key={item.category} value={item.category}>{item.category}</option>
              ))}
            </select>
          </label>
          <Button className="h-10 rounded-[8px]" disabled={!merchantName.trim() || !amount || !category} onClick={simulateTransaction}>
            Simulate transaction
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="surface-panel">
          <h2 className="text-xl font-semibold">Intercept result</h2>
          {intercept ? (
            <div className="mt-5 space-y-4">
              <Badge className={`rounded-[8px] ${intercept.flagged ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200"}`}>
                {intercept.flagged ? "Intentionality check" : "No interrupt"}
              </Badge>
              <p className="text-sm leading-6 text-muted-foreground">{intercept.reason}</p>
              <div className="rounded-[8px] border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold">Why Drift interrupts here</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{intercept.ahaMessage}</p>
                <p className="mt-2 text-sm leading-6">{intercept.nextMove}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Purchase" value={`${intercept.merchantName} · ${intercept.amountLabel}`} />
                <Metric label="Pattern" value={`${intercept.category} · ${intercept.driftPercentLabel}`} />
                <Metric label="Overspend" value={intercept.monthlyOverspendLabel} />
                <Metric label="Behavior tag" value={intercept.insightLabel} />
              </div>
              {intercept.flagged ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="h-10 rounded-[8px]" onClick={() => saveDecision("intentional")}>
                    Mark intentional
                  </Button>
                  <Button variant="outline" className="h-10 rounded-[8px] border-border bg-background" onClick={() => saveDecision("dismissed")}>
                    Dismiss
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Run a simulated transaction to see whether Drift would interrupt it.
            </p>
          )}
        </div>

        <div className="surface-panel">
          <h2 className="text-xl font-semibold">Saved decisions</h2>
          <div className="mt-5 space-y-3">
            {interceptDecisions.length > 0 ? interceptDecisions.map((decision) => (
              <div key={decision.id} className="surface-card text-sm">
                <p className="font-semibold">{decision.merchantName} · {decision.amountLabel}</p>
                <p className="mt-1 text-muted-foreground">{decision.category} marked {decision.decision}.</p>
              </div>
            )) : (
              <p className="text-sm leading-6 text-muted-foreground">No intercept decisions saved yet.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
