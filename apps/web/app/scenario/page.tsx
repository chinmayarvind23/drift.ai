"use client";

import { useAuditWorkspace } from "@/components/audit-workspace";
import { InfoHint, Metric } from "@/components/audit-ui";

export default function ScenarioPage() {
  const { projectionScenario, scan, setProjectionScenario } = useAuditWorkspace();

  return (
    <section className="mx-auto max-w-5xl px-5 py-6 md:px-8 lg:py-8">
      <div className="surface-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">What-if scenario</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Make the saved-and-invested estimate personal. This does not change your Drift Score.
            </p>
          </div>
          <InfoHint text="This lens only changes the what-if estimate for the monthly habit gap." />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Years</span>
            <input className="field-control" min={1} max={40} type="number" value={projectionScenario.years} onChange={(event) => setProjectionScenario({ ...projectionScenario, years: Number(event.target.value) })} />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase text-muted-foreground">Annual return %</span>
            <input className="field-control" min={0} max={15} step={0.5} type="number" value={Number((projectionScenario.annualReturnRate * 100).toFixed(1))} onChange={(event) => setProjectionScenario({ ...projectionScenario, annualReturnRate: Number(event.target.value) / 100 })} />
          </label>
        </div>
        <div className="mt-6">
          <Metric
            label="If saved and invested"
            value={scan.investmentGainLabel}
            tone="emerald"
            explanation={`This is the estimated investment growth above the money redirected from overspend. At 0% return, the growth is $0. Current scenario: ${scan.projectionScenarioLabel}.`}
            detail={`${scan.redirectedSavingsLabel} redirected from overspend`}
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Current scenario: {scan.projectionScenarioLabel}. This is a what-if lens, not a promise.
        </p>
      </div>
    </section>
  );
}
