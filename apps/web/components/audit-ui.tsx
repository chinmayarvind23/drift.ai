"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Info, LockKeyhole, RefreshCcw, ShieldCheck, TrendingUp } from "lucide-react";
import { DRIFT_CATEGORY_TAXONOMY } from "@/lib/evidence-review";
import type { DriftScanCategory } from "@/lib/drift-scan";
import type { EditableDriftTransaction, TransactionEdit } from "@/lib/transaction-edits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Metric({
  label,
  value,
  tone,
  explanation,
  detail,
  learnHref
}: {
  label: string;
  value: string;
  tone: "amber" | "emerald" | "rose";
  explanation: string;
  detail?: string;
  learnHref?: string;
}) {
  const toneClass = {
    amber:
      "bg-amber-50 text-amber-900 border-amber-200 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100",
    emerald:
      "bg-emerald-50 text-emerald-900 border-emerald-200 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100",
    rose:
      "bg-rose-50 text-rose-900 border-rose-200 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-100"
  }[tone];

  return (
    <div className={`rounded-[8px] border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-current/70">{label}</p>
        <InfoHint href={learnHref} text={explanation} />
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-current/70">{detail}</p> : null}
    </div>
  );
}

export function InfoHint({ href, text }: { href?: string; text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="How this is calculated"
        className="inline-flex size-5 items-center justify-center rounded-[8px] border border-current/20 bg-background/70 text-current/70 outline-none transition hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="size-3.5" />
      </button>
      <span className="pointer-events-auto absolute right-0 top-7 z-20 hidden w-72 rounded-[8px] border border-border bg-popover p-3 text-left text-xs font-normal leading-5 text-popover-foreground shadow-lg group-hover:block group-focus-within:block">
        <span className="absolute -top-3 right-0 h-3 w-28" />
        {text}
        {href ? (
          <Link
            className="mt-2 block font-semibold underline-offset-4 hover:underline"
            href={href}
          >
            Score guide
          </Link>
        ) : null}
      </span>
    </span>
  );
}

export function CategoryRow({ category }: { category: DriftScanCategory }) {
  return (
    <div className="surface-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="text-base font-semibold underline-offset-4 hover:underline"
              href={`/category/${encodeURIComponent(category.category)}`}
            >
              {category.category}
            </Link>
            <Badge className={`${stateClass(category.stateLabel)} rounded-[8px]`}>
              {category.stateLabel}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Old normal {category.baselineLabel}. Recent normal {category.recentLabel}.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold">{category.monthlyOverspendLabel}</p>
          <p className="text-xs text-muted-foreground">{category.driftPercentLabel} baseline shift</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-[8px] bg-muted">
        <div className="h-full rounded-[8px] bg-primary" style={{ width: `${category.barPercent}%` }} />
      </div>
    </div>
  );
}

export function EvidenceRow({
  transaction,
  onEdit
}: {
  transaction: EditableDriftTransaction;
  onEdit: (sourceHash: string, edit: TransactionEdit) => void;
}) {
  return (
    <div data-testid="evidence-row" className="grid gap-3 rounded-[8px] border border-border bg-background p-4 lg:grid-cols-[1fr_180px_1fr] lg:items-center">
      <div>
        <p className="text-sm font-semibold">{transaction.merchantName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatTransactionDate(transaction.transactionDate)} · {formatTransactionAmount(transaction.amountCents)}
        </p>
        {transaction.originalCategory ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded-[8px] bg-emerald-50 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200">
            <Check className="size-3" />
            Changed from {transaction.originalCategory}
          </p>
        ) : null}
      </div>
      <label className="space-y-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">Category</span>
        <select
          className="field-control"
          value={transaction.category}
          onChange={(event) => onEdit(transaction.sourceHash, { category: event.target.value })}
        >
          {DRIFT_CATEGORY_TAXONOMY.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">Private note</span>
        <input
          className="field-control"
          placeholder="Why this should or should not count"
          value={transaction.note ?? ""}
          onChange={(event) => onEdit(transaction.sourceHash, { note: event.target.value })}
        />
      </label>
    </div>
  );
}

export function StatusTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="surface-card shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs font-medium uppercase">{label}</p>
      </div>
      <p className="mt-3 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function PatternQuestion({ category = "Dining" }: { category?: string }) {
  return (
    <section className="overflow-hidden rounded-[8px] border border-border bg-zinc-950 text-white shadow-sm">
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
            {category} became part of the new normal. What changed around then?
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
          asChild
        >
          <Link href="/insights">Add context</Link>
        </Button>
      </div>
    </section>
  );
}

export function PrivacyStatus({ items }: { items: string[] }) {
  return (
    <section className="surface-panel">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-5 text-emerald-700" />
        <h2 className="text-lg font-semibold">Privacy status</h2>
      </div>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item} className="flex gap-3 text-sm leading-6 text-zinc-600">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-foreground" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SnapshotTiles({ transactionCount, scenarioLabel }: { transactionCount: number; scenarioLabel: string }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
      <StatusTile icon={<RefreshCcw className="size-4" />} label="Evidence" value={`${transactionCount} scanned`} />
      <StatusTile icon={<TrendingUp className="size-4" />} label="Scenario" value={scenarioLabel} />
    </section>
  );
}

function stateClass(state: DriftScanCategory["stateLabel"]): string {
  if (state === "High drift") return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200";
  if (state === "Watch") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200";
  if (state === "No longer active") return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";
  return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200";
}

function formatTransactionDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatTransactionAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}
