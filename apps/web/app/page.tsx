import Image from "next/image";
import type { ReactNode } from "react";
import {
  ArrowRight,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildDemoDriftScan, type DriftScanCategory } from "@/lib/drift-scan";

export default function Home() {
  const scan = buildDemoDriftScan();
  const topDriftCategories = scan.topCategories.filter(
    (category) => category.stateLabel !== "Stable"
  );

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
              <p className="text-xs text-zinc-500">Private scan workspace</p>
            </div>
          </div>
          <Badge className="rounded-[8px] border-emerald-200 bg-emerald-50 text-emerald-800">
            Local demo
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
                March income drift audit
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
                Your recent spending is running {scan.monthlyOverspendLabel} above the old
                monthly baseline.
              </p>
            </div>
            <Button className="h-10 rounded-[8px] bg-zinc-950 px-4 text-white hover:bg-zinc-800">
              Import CSV
              <ArrowRight />
            </Button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Metric label="Drift score" value={scan.scoreLabel} tone="amber" />
            <Metric label="Monthly overspend" value={scan.monthlyOverspendLabel} tone="rose" />
            <Metric label="10-year impact" value={scan.counterfactualLabel} tone="emerald" />
          </div>

          <Separator className="my-7" />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Top drift categories</h2>
              <p className="text-sm text-zinc-500">
                Baseline {scan.baselineWindowLabel} compared with {scan.recentWindowLabel}.
              </p>
            </div>
            <Badge className="w-fit rounded-[8px] border-zinc-200 bg-white text-zinc-700">
              {topDriftCategories.length} need review
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            {scan.topCategories.map((category) => (
              <CategoryRow key={category.category} category={category} />
            ))}
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
                <p className="text-sm text-zinc-200">Next question</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight">
                  Dining jumped after the job change. What changed around then?
                </h2>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm leading-6 text-zinc-300">
                A short answer turns this into a behavior tag for the next scan.
              </p>
              <Button
                variant="secondary"
                className="mt-4 h-10 rounded-[8px] bg-white text-zinc-950 hover:bg-zinc-100"
              >
                Add explanation
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

          <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
            <StatusTile
              icon={<RefreshCcw className="size-4" />}
              label="Last import"
              value="Mar 31, 2026"
            />
            <StatusTile
              icon={<TrendingUp className="size-4" />}
              label="Assumption"
              value="7% for 10 years"
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
  tone
}: {
  label: string;
  value: string;
  tone: "amber" | "emerald" | "rose";
}) {
  const toneClass = {
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200"
  }[tone];

  return (
    <div className={`rounded-[8px] border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase text-current/70">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
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
            {category.baselineLabel} baseline to {category.recentLabel} recent.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold">{category.monthlyOverspendLabel}</p>
          <p className="text-xs text-zinc-500">{category.driftPercentLabel} increase</p>
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
