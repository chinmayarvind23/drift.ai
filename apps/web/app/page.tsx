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
    loadSyntheticUser,
    scan,
    selectedSyntheticUser,
    selectedSyntheticUserId,
    setSelectedSyntheticUserId,
    sourceMessage,
    syntheticUsers
  } = useAuditWorkspace();
  const topDriftCategories = scan.topCategories.filter((category) => category.stateLabel !== "Stable");

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:py-8">
      <section className="surface-panel">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge className="mb-4 rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800">
              Scan complete
            </Badge>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] md:text-6xl">
              Where did the raise go?
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
              Drift compares your old normal with your recent normal, then points to the
              spending patterns that quietly changed.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-[8px] border border-zinc-200 bg-white p-3">
              <label className="text-xs font-medium uppercase text-muted-foreground" htmlFor="dummy-user">
                Test profile
              </label>
              <select
                id="dummy-user"
                className="field-control"
                value={selectedSyntheticUserId}
                onChange={(event) => setSelectedSyntheticUserId(event.target.value)}
              >
                {syntheticUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.scenario}
                  </option>
                ))}
              </select>
              <Button variant="outline" className="h-10 rounded-[8px] border-border bg-background" onClick={loadSyntheticUser}>
                Load test profile
              </Button>
            </div>
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
        {selectedSyntheticUser ? (
          <div className="mt-3 surface-card text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">{selectedSyntheticUser.scenario}:</span> {selectedSyntheticUser.incomeEvent}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Metric label="Drift score" value={scan.scoreLabel} tone="amber" explanation="This is the overall shift from your old spending normal to your recent spending normal. Bigger repeated increases count more than tiny changes." />
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Evidence of drift</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>Old normal {scan.baselineWindowLabel} compared with recent normal {scan.recentWindowLabel}.</span>
              <InfoHint text="Drift uses the first 3 valid months as your old normal and the latest 3 valid months as your recent normal." />
            </div>
          </div>
          <Badge className="w-fit rounded-[8px] border-border bg-background text-muted-foreground">
            {topDriftCategories.length} patterns flagged
          </Badge>
        </div>

        <div className="mt-5 space-y-4">
          {scan.topCategories.length > 0 ? scan.topCategories.map((category) => <CategoryRow key={category.category} category={category} />) : (
            <div className="surface-card text-sm leading-6 text-muted-foreground">
              Import at least six months of transaction history so Drift can compare your old normal with your recent normal.
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <PatternQuestion />
        <PrivacyStatus items={scan.privacyItems} />
        <SnapshotTiles transactionCount={scan.transactionCount} scenarioLabel={scan.projectionScenarioLabel} />
      </aside>
    </div>
  );
}
