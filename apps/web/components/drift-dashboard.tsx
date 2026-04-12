"use client";

import Image from "next/image";
import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { parseTransactionsCsv, type DriftTransaction } from "@drift/core";
import {
  ArrowRight,
  FileWarning,
  Info,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  buildDemoDriftScan,
  buildDriftScan,
  clampProjectionScenario,
  type DriftScan,
  type DriftScanCategory,
  type ProjectionScenario
} from "@/lib/drift-scan";
import { listSyntheticUsers, type SyntheticUser } from "@/lib/synthetic-users";

const DEFAULT_SCENARIO: ProjectionScenario = {
  years: 10,
  annualReturnRate: 0.07
};

export function DriftDashboard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syntheticUsers = useMemo(() => listSyntheticUsers(), []);
  const [projectionScenario, setProjectionScenario] = useState<ProjectionScenario>(DEFAULT_SCENARIO);
  const [activeTransactions, setActiveTransactions] = useState(() => ({
    transactions: null as DriftTransaction[] | null,
    sourceLabel: "Demo data"
  }));
  const [scan, setScan] = useState<DriftScan>(() => buildDemoDriftScan(DEFAULT_SCENARIO));
  const [importError, setImportError] = useState<string | null>(null);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const [selectedSyntheticUserId, setSelectedSyntheticUserId] = useState(syntheticUsers[0]?.id ?? "");
  const [selectedSyntheticUser, setSelectedSyntheticUser] = useState<SyntheticUser | null>(null);
  const topDriftCategories = useMemo(
    () => scan.topCategories.filter((category) => category.stateLabel !== "Stable"),
    [scan.topCategories]
  );

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csv = await file.text();
      const transactions = parseTransactionsCsv(csv);
      const nextScan = buildDriftScan(transactions, "Imported CSV", projectionScenario);
      setScan(nextScan);
      setActiveTransactions({
        transactions,
        sourceLabel: "Imported CSV"
      });
      setSourceMessage(`Imported ${nextScan.transactionCount} transactions from ${file.name}.`);
      setSelectedSyntheticUser(null);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Could not import this CSV.");
    } finally {
      event.target.value = "";
    }
  }

  function handleSyntheticUserLoad() {
    const syntheticUser = syntheticUsers.find((user) => user.id === selectedSyntheticUserId);

    if (!syntheticUser) {
      setImportError("Choose a dummy user before loading synthetic data.");
      return;
    }

    const nextScan = buildDriftScan(syntheticUser.transactions, syntheticUser.name, projectionScenario);
    setScan(nextScan);
    setActiveTransactions({
      transactions: syntheticUser.transactions,
      sourceLabel: syntheticUser.name
    });
    setSelectedSyntheticUser(syntheticUser);
    setSourceMessage(`Loaded ${nextScan.transactionCount} synthetic transactions for ${syntheticUser.name}.`);
    setImportError(null);
  }

  function handleScenarioChange(nextScenario: ProjectionScenario) {
    const clampedScenario = clampProjectionScenario(nextScenario);
    setProjectionScenario(clampedScenario);

    if (activeTransactions.transactions) {
      setScan(
        buildDriftScan(
          activeTransactions.transactions,
          activeTransactions.sourceLabel,
          clampedScenario
        )
      );
      return;
    }

    setScan(buildDemoDriftScan(clampedScenario));
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-zinc-950">
      <header className="border-b border-zinc-200 bg-[#fbfcf8]/90 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[8px] bg-zinc-950 text-sm font-semibold text-white">
              D
            </div>
            <div>
              <p className="text-sm font-semibold">Drift</p>
              <p className="text-xs text-zinc-500">Private lifestyle audit</p>
            </div>
          </div>
          <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800">
            {scan.sourceLabel}
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 md:grid-cols-[1.05fr_0.95fr] md:px-8 lg:py-8">
        <section className="rounded-[8px] border border-zinc-200 bg-[#fbfcf8] p-5 shadow-sm md:p-7">
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
                <label className="text-xs font-medium uppercase text-zinc-500" htmlFor="dummy-user">
                  Test profile
                </label>
                <select
                  id="dummy-user"
                  className="h-10 rounded-[8px] border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400"
                  value={selectedSyntheticUserId}
                  onChange={(event) => setSelectedSyntheticUserId(event.target.value)}
                >
                  {syntheticUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.scenario}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="h-10 rounded-[8px] border-zinc-200 bg-white"
                  onClick={handleSyntheticUserLoad}
                >
                  Load test profile
                </Button>
              </div>
              <input
                ref={fileInputRef}
                aria-label="Import CSV"
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvImport}
              />
              <Button
                className="h-10 rounded-[8px] bg-zinc-950 px-4 text-white hover:bg-zinc-800"
                onClick={() => fileInputRef.current?.click()}
              >
                Import CSV
                <ArrowRight />
              </Button>
              <p className="text-xs text-zinc-500 md:text-right">
                Required CSV columns: date, merchant, amount, category.
              </p>
            </div>
          </div>

          {importError ? (
            <div className="mt-5 flex gap-3 rounded-[8px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <FileWarning className="mt-0.5 size-4 shrink-0" />
              <span>{importError}</span>
            </div>
          ) : null}

          {sourceMessage ? (
            <div className="mt-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              {sourceMessage}
            </div>
          ) : null}

          {selectedSyntheticUser ? (
            <div className="mt-3 rounded-[8px] border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
              <span className="font-medium text-zinc-950">{selectedSyntheticUser.scenario}:</span>{" "}
              {selectedSyntheticUser.incomeEvent}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric
              label="Drift score"
              value={scan.scoreLabel}
              tone="amber"
              explanation="This is the overall shift from your old spending normal to your recent spending normal. Bigger repeated increases count more than tiny changes. A high number means your monthly habits changed in a meaningful way."
            />
            <Metric
              label="Overspend"
              value={scan.monthlyOverspendLabel}
              tone="rose"
              explanation="This is the extra amount showing up each month compared with your old baseline. Example: if dining used to average $200 and now averages $320, the gap is $120 per month."
            />
            <Metric
              label="If saved and invested"
              value={scan.counterfactualLabel}
              tone="emerald"
              explanation={`This asks: what could the monthly overspend become if it did not turn into a habit? Your current scenario uses ${scan.projectionScenarioLabel}, compounded monthly. It is a scenario, not a prediction.`}
            />
          </div>

          <Separator className="my-7" />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Evidence of drift</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span>
                  Old normal {scan.baselineWindowLabel} compared with recent normal{" "}
                  {scan.recentWindowLabel}.
                </span>
                <InfoHint text="Drift uses the first 3 valid months as your old normal and the latest 3 valid months as your recent normal. A category needs old baseline spending before it can count as drift, so one-off new categories do not distort the scan." />
              </div>
            </div>
            <Badge className="w-fit rounded-[8px] border-zinc-200 bg-white text-zinc-700">
              {topDriftCategories.length} patterns flagged
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            {scan.topCategories.length > 0 ? (
              scan.topCategories.map((category) => (
                <CategoryRow key={category.category} category={category} />
              ))
            ) : (
              <div className="rounded-[8px] border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-600">
                Import at least six months of transaction history so Drift can compare your
                old normal with your recent normal.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-[8px] border border-zinc-200 bg-zinc-950 text-white shadow-sm">
            <div className="relative h-56">
              <Image
                src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80"
                alt="Receipts and financial notes on a desk"
                fill
                priority
                className="object-cover opacity-75"
                sizes="(min-width: 768px) 45vw, 100vw"
              />
              <div className="absolute inset-0 bg-zinc-950/35" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-sm text-zinc-200">Pattern question</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">
                  Dining became part of the new normal. What changed around then?
                </h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm leading-6 text-zinc-300">
                A short answer turns a spending change into a private behavior note.
              </p>
              <Button
                variant="secondary"
                className="mt-4 h-10 rounded-[8px] bg-white text-zinc-950 hover:bg-zinc-100"
              >
                Add context
              </Button>
            </div>
          </section>

          <section className="rounded-[8px] border border-zinc-200 bg-[#fbfcf8] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-emerald-700" />
              <h2 className="text-lg font-semibold">Privacy status</h2>
            </div>
            <div className="mt-5 space-y-4">
              {scan.privacyItems.map((item) => (
                <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-600">
                  <LockKeyhole className="mt-0.5 size-4 shrink-0 text-zinc-900" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-zinc-200 bg-[#fbfcf8] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Personal scenario</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Tune the saved-and-invested estimate to match how you think about time and
                  risk.
                </p>
              </div>
              <InfoHint text="This does not change your Drift Score or overspend. It only changes the what-if estimate for the habit gap if that money were saved or invested instead." />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase text-zinc-500">Years</span>
                <input
                  className="h-10 w-full rounded-[8px] border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  min={1}
                  max={40}
                  type="number"
                  value={projectionScenario.years}
                  onChange={(event) =>
                    handleScenarioChange({
                      ...projectionScenario,
                      years: Number(event.target.value)
                    })
                  }
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase text-zinc-500">
                  Annual return %
                </span>
                <input
                  className="h-10 w-full rounded-[8px] border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  min={0}
                  max={15}
                  step={0.5}
                  type="number"
                  value={Number((projectionScenario.annualReturnRate * 100).toFixed(1))}
                  onChange={(event) =>
                    handleScenarioChange({
                      ...projectionScenario,
                      annualReturnRate: Number(event.target.value) / 100
                    })
                  }
                />
              </label>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              Current scenario: {scan.projectionScenarioLabel}. This is a what-if lens, not a
              promise.
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <StatusTile
              icon={<RefreshCcw className="size-4" />}
              label="Evidence"
              value={`${scan.transactionCount} scanned`}
            />
            <StatusTile
              icon={<TrendingUp className="size-4" />}
              label="Scenario"
              value={scan.projectionScenarioLabel}
            />
          </section>
        </aside>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
  explanation
}: {
  label: string;
  value: string;
  tone: "amber" | "emerald" | "rose";
  explanation: string;
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200"
  }[tone];

  return (
    <div className={`rounded-[8px] border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-current/70">{label}</p>
        <InfoHint text={explanation} />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="How this is calculated"
        className="inline-flex size-5 items-center justify-center rounded-[8px] border border-current/20 bg-white/70 text-current/70 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <Info className="size-3.5" />
      </button>
      <span className="pointer-events-none absolute right-0 top-7 z-20 hidden w-72 rounded-[8px] border border-zinc-200 bg-white p-3 text-left text-xs font-normal leading-5 text-zinc-700 shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function CategoryRow({ category }: { category: DriftScanCategory }) {
  return (
    <div className="rounded-[8px] border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{category.category}</h3>
            <Badge className={`${stateClass(category.stateLabel)} rounded-[8px]`}>
              {category.stateLabel}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Old normal {category.baselineLabel}. Recent normal {category.recentLabel}.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold">{category.monthlyOverspendLabel}</p>
          <p className="text-xs text-zinc-500">{category.driftPercentLabel} baseline shift</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-[8px] bg-zinc-100">
        <div
          className="h-full rounded-[8px] bg-zinc-950"
          style={{ width: `${category.barPercent}%` }}
        />
      </div>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-zinc-200 bg-[#fbfcf8] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <p className="text-xs font-medium uppercase">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold">{value}</p>
    </div>
  );
}

function stateClass(state: DriftScanCategory["stateLabel"]): string {
  if (state === "High drift") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (state === "Watch") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}
